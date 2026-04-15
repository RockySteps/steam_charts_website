import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { gameCache, InsertGameCache, InsertUser, playerHistory, users } from "../drizzle/schema";
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
  return result.length > 0 ? result[0] : undefined;
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
