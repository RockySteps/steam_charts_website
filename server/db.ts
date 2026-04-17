import { and, asc, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  crawlLog, crawlQueue, gameCache,
  InsertCrawlLog, InsertCrawlQueue, InsertGameCache, InsertMonthlyStats, InsertUser,
  monthlyStats, playerHistory, users
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User Helpers ──────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? undefined;
}

// ─── Game Cache Helpers ────────────────────────────────────────────────────────

export async function upsertGameCache(game: InsertGameCache): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updateSet: Partial<InsertGameCache> = { ...game };
  delete (updateSet as Record<string, unknown>).appid;
  delete (updateSet as Record<string, unknown>).id;
  await db.insert(gameCache).values(game).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getGameByAppid(appid: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(gameCache).where(eq(gameCache.appid, appid)).limit(1);
  return result[0] ?? null;
}

export async function getTopGamesByPlayers(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gameCache).orderBy(desc(gameCache.ccu)).limit(limit);
}

export async function getTopGamesByOwnersMax(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gameCache).orderBy(desc(gameCache.ownersMax)).limit(limit);
}

export async function getTopGamesByAllTimePeak(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gameCache).orderBy(desc(gameCache.peakPlayersAllTime)).limit(limit);
}

export async function searchGames(opts: {
  query?: string;
  genre?: string;
  minPrice?: number;
  maxPrice?: number;
  minPlayers?: number;
  maxPlayers?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts.query) conditions.push(like(gameCache.name, `%${opts.query}%`));
  if (opts.genre) conditions.push(like(gameCache.genre, `%${opts.genre}%`));
  if (opts.minPrice !== undefined) conditions.push(gte(gameCache.priceUsd, opts.minPrice));
  if (opts.maxPrice !== undefined) conditions.push(lte(gameCache.priceUsd, opts.maxPrice));
  if (opts.minPlayers !== undefined) conditions.push(gte(gameCache.ccu, opts.minPlayers));
  if (opts.maxPlayers !== undefined) conditions.push(lte(gameCache.ccu, opts.maxPlayers));

  const query = db.select().from(gameCache);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(gameCache.ccu)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
  }
  return query.orderBy(desc(gameCache.ccu)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
}

export async function getGamesByGenreFromDb(genre: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gameCache)
    .where(like(gameCache.genre, `%${genre}%`))
    .orderBy(desc(gameCache.ccu))
    .limit(limit);
}

export async function getTotalGamesCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(gameCache);
  return result[0]?.count ?? 0;
}

export async function getTotalPlayersOnline() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: sql<number>`sum(ccu)` }).from(gameCache);
  return result[0]?.total ?? 0;
}

export async function getRecentlyUpdatedGames(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gameCache).orderBy(desc(gameCache.lastUpdated)).limit(limit);
}

/**
 * Returns games with the biggest absolute player count change (ccu - prevCcu).
 * type: 'gainers' | 'losers' | 'all'
 */
export async function getTrendingNow(opts: {
  type?: "gainers" | "losers" | "all";
  limit?: number;
  minCcu?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  // Only include games that have been updated recently (have a prevCcu snapshot)
  const minCcu = opts.minCcu ?? 50;
  const limit = opts.limit ?? 20;

  const games = await db.select().from(gameCache)
    .where(gte(gameCache.ccu, minCcu))
    .orderBy(desc(gameCache.ccu))
    .limit(500); // fetch top 500 by CCU, then compute change

  // Compute absolute and percent change
  const withChange = games.map((g) => {
    const prev = g.prevCcu ?? 0;
    const curr = g.ccu ?? 0;
    const change = curr - prev;
    const changePct = prev > 0 ? (change / prev) * 100 : 0;
    return { ...g, change, changePct };
  });

  // Filter by type
  const filtered = opts.type === "gainers"
    ? withChange.filter((g) => g.change > 0)
    : opts.type === "losers"
      ? withChange.filter((g) => g.change < 0)
      : withChange;

  // Sort gainers by biggest gain, losers by biggest loss
  if (opts.type === "losers") {
    filtered.sort((a, b) => a.change - b.change);
  } else {
    filtered.sort((a, b) => b.change - a.change);
  }

  return filtered.slice(0, limit);
}

/**
 * Update prevCcu for a game before writing new ccu value.
 * Called by the crawler before updating current player count.
 */
export async function updatePrevCcu(appid: number, currentCcu: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(gameCache)
    .set({ prevCcu: currentCcu, ccuUpdatedAt: new Date() })
    .where(eq(gameCache.appid, appid));
}

// ─── Player History Helpers ────────────────────────────────────────────────────

export async function recordPlayerCount(appid: number, players: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(playerHistory).values({ appid, players });
}

export async function getPlayerHistory(appid: number, since: Date) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(playerHistory)
    .where(and(eq(playerHistory.appid, appid), gte(playerHistory.recordedAt, since)))
    .orderBy(playerHistory.recordedAt);
}

// ─── Monthly Stats Helpers ─────────────────────────────────────────────────────

export async function upsertMonthlyStats(stats: InsertMonthlyStats): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updateSet: Partial<InsertMonthlyStats> = { ...stats };
  delete (updateSet as Record<string, unknown>).id;
  await db.insert(monthlyStats).values(stats).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getMonthlyStatsByAppid(appid: number, limit = 24) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(monthlyStats)
    .where(eq(monthlyStats.appid, appid))
    .orderBy(desc(monthlyStats.year), desc(monthlyStats.month))
    .limit(limit);
}

// ─── Crawl Queue Helpers ───────────────────────────────────────────────────────

export async function seedCrawlQueue(appids: number[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Insert in batches of 500 to avoid query size limits
  const batchSize = 500;
  for (let i = 0; i < appids.length; i += batchSize) {
    const batch = appids.slice(i, i + batchSize);
    const values: InsertCrawlQueue[] = batch.map((appid) => ({
      appid,
      priority: 2,
      status: "pending" as const,
      retryCount: 0,
    }));
    // Use INSERT IGNORE style via onDuplicateKeyUpdate with no changes
    await db.insert(crawlQueue).values(values).onDuplicateKeyUpdate({
      set: { priority: sql`priority` }, // no-op update to skip duplicates
    });
  }
}

export async function setPriorityForAppids(appids: number[], priority: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (appids.length === 0) return;
  await db.update(crawlQueue)
    .set({ priority })
    .where(inArray(crawlQueue.appid, appids));
}

export async function getNextCrawlBatch(limit = 10): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  // Use sql template for limit to avoid TiDB/MySQL "Incorrect arguments to LIMIT" error
  // when Drizzle passes limit as a bound parameter instead of an inline integer
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const rows = await db.select({ appid: crawlQueue.appid })
    .from(crawlQueue)
    .where(
      and(
        eq(crawlQueue.status, "pending"),
        or(
          sql`${crawlQueue.nextCrawlAt} IS NULL`,
          lte(crawlQueue.nextCrawlAt, now)
        )
      )
    )
    .orderBy(asc(crawlQueue.priority), asc(crawlQueue.updatedAt))
    .limit(safeLimit);
  return rows.map((r) => r.appid);
}

export async function markCrawlProcessing(appid: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(crawlQueue)
    .set({ status: "processing" })
    .where(eq(crawlQueue.appid, appid));
}

export async function markCrawlDone(appid: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const next24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.update(crawlQueue)
    .set({ status: "done", lastCrawledAt: new Date(), nextCrawlAt: next24h, retryCount: 0, errorMessage: null })
    .where(eq(crawlQueue.appid, appid));
}

export async function markCrawlFailed(appid: number, error: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Retry after 1 hour on failure
  const nextRetry = new Date(Date.now() + 60 * 60 * 1000);
  await db.update(crawlQueue)
    .set({
      status: "pending",
      nextCrawlAt: nextRetry,
      errorMessage: error.slice(0, 500),
      retryCount: sql`retry_count + 1`,
    })
    .where(eq(crawlQueue.appid, appid));
}

export async function resetStaleCrawls(): Promise<void> {
  // Reset any "processing" items that got stuck (e.g. server restart)
  const db = await getDb();
  if (!db) return;
  await db.update(crawlQueue)
    .set({ status: "pending" })
    .where(eq(crawlQueue.status, "processing"));
}

export async function resetAllPendingCrawls(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(crawlQueue)
    .set({ status: "pending", nextCrawlAt: null })
    .where(eq(crawlQueue.status, "done"));
}

export async function getCrawlQueueStats() {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, processing: 0, done: 0, failed: 0 };
  const rows = await db.select({
    status: crawlQueue.status,
    count: sql<number>`count(*)`,
  }).from(crawlQueue).groupBy(crawlQueue.status);

  const stats = { total: 0, pending: 0, processing: 0, done: 0, failed: 0 };
  for (const row of rows) {
    const count = Number(row.count);
    stats.total += count;
    if (row.status === "pending") stats.pending = count;
    else if (row.status === "processing") stats.processing = count;
    else if (row.status === "done") stats.done = count;
    else if (row.status === "failed") stats.failed = count;
  }
  return stats;
}

export async function getCrawlQueuePage(opts: { limit: number; offset: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = opts.status ? [eq(crawlQueue.status, opts.status as "pending" | "processing" | "done" | "failed")] : [];
  const query = db.select().from(crawlQueue);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(asc(crawlQueue.priority), desc(crawlQueue.updatedAt)).limit(opts.limit).offset(opts.offset);
  }
  return query.orderBy(asc(crawlQueue.priority), desc(crawlQueue.updatedAt)).limit(opts.limit).offset(opts.offset);
}

// ─── Crawl Log Helpers ─────────────────────────────────────────────────────────

export async function createCrawlLog(log: InsertCrawlLog): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(crawlLog).values(log);
}

export async function updateCrawlLog(jobId: string, update: Partial<InsertCrawlLog>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(crawlLog).set(update).where(eq(crawlLog.jobId, jobId));
}

export async function getRecentCrawlLogs(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crawlLog).orderBy(desc(crawlLog.startedAt)).limit(limit);
}

export async function getActiveCrawlLog() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(crawlLog).where(eq(crawlLog.status, "running")).limit(1);
  return rows[0] ?? null;
}
