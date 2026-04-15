/**
 * Crawler Service
 * Manages the 13K game crawl queue with priority-based processing:
 * - Priority 1: Top 100 games by CCU (crawled immediately on startup)
 * - Priority 2: All other games from apps.txt (crawled in batches)
 * - 24-hour auto-refresh for all games
 * - Rate-limit safe: 1 request per second max
 */

import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import {
  createCrawlLog, getCrawlQueueStats, getNextCrawlBatch,
  getTopGamesByPlayers, markCrawlDone, markCrawlFailed,
  markCrawlProcessing, resetStaleCrawls, seedCrawlQueue,
  setPriorityForAppids, updateCrawlLog, upsertGameCache,
  upsertMonthlyStats, recordPlayerCount, getPlayerHistory
} from "../db";
import { getAppDetails as getSteamAppDetails, getCurrentPlayers } from "./steamApi";
import { getAppDetails as getSteamSpyAppDetails } from "./steamSpyApi";

// ─── State ─────────────────────────────────────────────────────────────────────

interface CrawlerState {
  isRunning: boolean;
  isPaused: boolean;
  currentJobId: string | null;
  processedCount: number;
  successCount: number;
  failedCount: number;
  startedAt: Date | null;
  lastActivity: Date | null;
}

const state: CrawlerState = {
  isRunning: false,
  isPaused: false,
  currentJobId: null,
  processedCount: 0,
  successCount: 0,
  failedCount: 0,
  startedAt: null,
  lastActivity: null,
};

let crawlLoopTimer: ReturnType<typeof setTimeout> | null = null;
let schedulerTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Apps.txt Loader ───────────────────────────────────────────────────────────

export function loadAppIds(): number[] {
  try {
    const filePath = path.join(process.cwd(), "server", "apps.txt");
    const content = fs.readFileSync(filePath, "utf-8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && /^\d+$/.test(line))
      .map((line) => parseInt(line, 10));
  } catch (e) {
    console.error("[Crawler] Failed to load apps.txt:", e);
    return [];
  }
}

// ─── Initialization ────────────────────────────────────────────────────────────

export async function initializeCrawler(): Promise<void> {
  console.log("[Crawler] Initializing...");

  // Reset any stale processing items from previous run
  await resetStaleCrawls();

  // Load all app IDs from apps.txt and seed the queue
  const appIds = loadAppIds();
  if (appIds.length > 0) {
    console.log(`[Crawler] Seeding crawl queue with ${appIds.length} app IDs...`);
    await seedCrawlQueue(appIds);
    console.log("[Crawler] Crawl queue seeded.");
  }

  // Set priority 1 for top 100 games by current CCU
  const topGames = await getTopGamesByPlayers(100);
  if (topGames.length > 0) {
    const topAppIds = topGames.map((g) => g.appid);
    await setPriorityForAppids(topAppIds, 1);
    console.log(`[Crawler] Set priority 1 for ${topAppIds.length} top games.`);
  }

  // Start the crawl loop
  startCrawler("startup");

  // Schedule 24-hour refresh
  scheduleAutoRefresh();
}

// ─── Crawler Control ───────────────────────────────────────────────────────────

export function getCrawlerState(): CrawlerState & { queueStats?: Record<string, number> } {
  return { ...state };
}

export async function startCrawler(triggerType: "startup" | "scheduled" | "manual" | "admin" = "manual"): Promise<string> {
  if (state.isRunning) {
    console.log("[Crawler] Already running.");
    return state.currentJobId ?? "";
  }

  const jobId = nanoid();
  state.isRunning = true;
  state.isPaused = false;
  state.currentJobId = jobId;
  state.processedCount = 0;
  state.successCount = 0;
  state.failedCount = 0;
  state.startedAt = new Date();
  state.lastActivity = new Date();

  await createCrawlLog({
    jobId,
    status: "running",
    triggerType,
    totalGames: 0,
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
  });

  console.log(`[Crawler] Started job ${jobId} (trigger: ${triggerType})`);
  runCrawlLoop(jobId);
  return jobId;
}

export async function stopCrawler(): Promise<void> {
  if (!state.isRunning) return;
  state.isRunning = false;
  state.isPaused = false;
  if (crawlLoopTimer) { clearTimeout(crawlLoopTimer); crawlLoopTimer = null; }

  if (state.currentJobId) {
    await updateCrawlLog(state.currentJobId, {
      status: "stopped",
      completedAt: new Date(),
      successCount: state.successCount,
      failedCount: state.failedCount,
      totalGames: state.processedCount,
    });
  }
  console.log(`[Crawler] Stopped. Processed: ${state.processedCount}, Success: ${state.successCount}, Failed: ${state.failedCount}`);
  state.currentJobId = null;
}

export async function pauseCrawler(): Promise<void> {
  state.isPaused = true;
  console.log("[Crawler] Paused.");
}

export async function resumeCrawler(): Promise<void> {
  if (!state.isRunning) {
    await startCrawler("admin");
    return;
  }
  state.isPaused = false;
  if (state.currentJobId) runCrawlLoop(state.currentJobId);
  console.log("[Crawler] Resumed.");
}

// ─── Core Crawl Loop ───────────────────────────────────────────────────────────

const BATCH_SIZE = 5;           // Games per batch
const DELAY_BETWEEN_GAMES = 1200; // ms between individual game fetches (rate limit safe)
const DELAY_BETWEEN_BATCHES = 3000; // ms between batches

async function runCrawlLoop(jobId: string): Promise<void> {
  if (!state.isRunning || state.isPaused || state.currentJobId !== jobId) return;

  try {
    const batch = await getNextCrawlBatch(BATCH_SIZE);

    if (batch.length === 0) {
      // No more pending games — job complete
      console.log(`[Crawler] Job ${jobId} complete. All games processed.`);
      state.isRunning = false;
      await updateCrawlLog(jobId, {
        status: "completed",
        completedAt: new Date(),
        successCount: state.successCount,
        failedCount: state.failedCount,
        totalGames: state.processedCount,
      });
      state.currentJobId = null;
      return;
    }

    for (const appid of batch) {
      if (!state.isRunning || state.isPaused) break;
      await crawlSingleGame(appid);
      state.processedCount++;
      state.lastActivity = new Date();
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_GAMES));
    }

    // Update log periodically
    if (state.processedCount % 50 === 0 && state.currentJobId) {
      await updateCrawlLog(state.currentJobId, {
        successCount: state.successCount,
        failedCount: state.failedCount,
        totalGames: state.processedCount,
      });
    }

    // Schedule next batch
    if (state.isRunning && !state.isPaused) {
      crawlLoopTimer = setTimeout(() => runCrawlLoop(jobId), DELAY_BETWEEN_BATCHES);
    }
  } catch (e) {
    console.error("[Crawler] Loop error:", e);
    crawlLoopTimer = setTimeout(() => runCrawlLoop(jobId), 10000);
  }
}

// ─── Single Game Crawler ───────────────────────────────────────────────────────

export async function crawlSingleGame(appid: number): Promise<boolean> {
  try {
    await markCrawlProcessing(appid);

    // Fetch from SteamSpy (primary - has owners, playtime, tags)
    const spyData = await getSteamSpyAppDetails(appid).catch(() => null);

    // Fetch from Steam Store API (secondary - has reviews, screenshots, price)
    const steamData = await getSteamAppDetails(appid).catch(() => null);

    // Fetch live player count
    const livePlayerCount = await getCurrentPlayers(appid).catch(() => 0);

    if (!spyData && !steamData) {
      await markCrawlFailed(appid, "No data from either API");
      state.failedCount++;
      return false;
    }

    const name = steamData?.name ?? spyData?.name ?? `App ${appid}`;
    const tags = spyData?.tags ? Object.keys(spyData.tags).slice(0, 15) : [];
    const genres = steamData?.genres?.map((g) => g.description) ??
      (spyData?.genre ? spyData.genre.split(", ").filter(Boolean) : []);

    // Build review summary from Steam API
    const reviewSummary = buildReviewSummary(steamData);

    await upsertGameCache({
      appid,
      name,
      developer: steamData?.developers?.join(", ") ?? spyData?.developer ?? "",
      publisher: steamData?.publishers?.join(", ") ?? spyData?.publisher ?? "",
      genre: genres.join(", "),
      tags,
      headerImage: steamData?.headerImage ?? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
      capsuleImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_231x87.jpg`,
      priceUsd: steamData?.priceUsd ?? (spyData && spyData.price > 0 ? spyData.price / 100 : null),
      originalPriceUsd: steamData?.originalPriceUsd ?? (spyData && spyData.initialPrice > 0 ? spyData.initialPrice / 100 : null),
      discountPercent: steamData?.discountPercent ?? spyData?.discount ?? 0,
      isFree: (steamData?.isFree || (spyData?.price === 0)) ? 1 : 0,
      releaseDate: steamData?.releaseDate ?? "",
      reviewScore: steamData?.reviewScore ?? 0,
      reviewScoreDesc: steamData?.reviewScoreDesc ?? "",
      reviewSummary,
      reviewType: getReviewType(steamData?.reviewScore ?? 0),
      totalReviews: steamData?.totalReviews ?? 0,
      positiveReviews: steamData?.positiveReviews ?? 0,
      negativeReviews: steamData?.negativeReviews ?? 0,
      metacriticScore: steamData?.metacriticScore ?? null,
      shortDescription: steamData?.shortDescription ?? "",
      website: steamData?.website ?? null,
      platforms: steamData?.platforms ?? { windows: true, mac: false, linux: false },
      screenshots: steamData?.screenshots ?? [],
      background: steamData?.background ?? "",
      currentPlayers: livePlayerCount || spyData?.ccu || 0,
      peakPlayers: spyData?.ccu || livePlayerCount || 0,
      peakPlayersAllTime: spyData?.ccu || livePlayerCount || 0,
      averagePlaytimeForever: spyData?.averageForever ?? 0,
      averagePlaytime2weeks: spyData?.average2weeks ?? 0,
      ownersMin: spyData?.ownersMin ?? 0,
      ownersMax: spyData?.ownersMax ?? 0,
      ccu: livePlayerCount || spyData?.ccu || 0,
      scoreRank: spyData?.scoreRank ?? "",
    });

    // Record player count snapshot
    const playerCount = livePlayerCount || spyData?.ccu || 0;
    if (playerCount > 0) {
      await recordPlayerCount(appid, playerCount);
    }

    await markCrawlDone(appid);
    state.successCount++;
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markCrawlFailed(appid, msg);
    state.failedCount++;
    return false;
  }
}

// ─── Monthly Stats Generation ──────────────────────────────────────────────────

export async function generateMonthlyStats(appid: number): Promise<void> {
  try {
    // Get last 2 years of player history
    const since = new Date();
    since.setFullYear(since.getFullYear() - 2);
    const history = await getPlayerHistory(appid, since);

    if (history.length === 0) return;

    // Group by year/month
    const monthMap = new Map<string, { players: number[]; peak: number }>();
    for (const record of history) {
      const d = new Date(record.recordedAt);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!monthMap.has(key)) monthMap.set(key, { players: [], peak: 0 });
      const entry = monthMap.get(key)!;
      entry.players.push(record.players);
      if (record.players > entry.peak) entry.peak = record.players;
    }

    // Convert to sorted array and compute gain
    const months = Array.from(monthMap.entries())
      .map(([key, data]) => {
        const [year, month] = key.split("-").map(Number);
        const avg = data.players.reduce((a, b) => a + b, 0) / data.players.length;
        return { year: year!, month: month!, avg, peak: data.peak, count: data.players.length };
      })
      .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

    // Upsert each month with gain calculation
    for (let i = 0; i < months.length; i++) {
      const curr = months[i]!;
      const prev = i > 0 ? months[i - 1] : null;
      const gain = prev ? curr.avg - prev.avg : 0;
      const gainPercent = prev && prev.avg > 0 ? (gain / prev.avg) * 100 : 0;

      await upsertMonthlyStats({
        appid,
        year: curr.year,
        month: curr.month,
        avgPlayers: Math.round(curr.avg * 10) / 10,
        peakPlayers: curr.peak,
        minPlayers: Math.min(...(monthMap.get(`${curr.year}-${curr.month}`)?.players ?? [0])),
        gain: Math.round(gain * 10) / 10,
        gainPercent: Math.round(gainPercent * 100) / 100,
        dataPoints: curr.count,
      });
    }
  } catch (e) {
    console.error(`[Crawler] Failed to generate monthly stats for ${appid}:`, e);
  }
}

// ─── 24-Hour Auto Refresh Scheduler ───────────────────────────────────────────

function scheduleAutoRefresh(): void {
  // Run every 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  schedulerTimer = setInterval(async () => {
    console.log("[Crawler] 24-hour auto-refresh triggered.");
    if (!state.isRunning) {
      // Reset all done items back to pending for re-crawl
      const { resetAllPendingCrawls } = await import("../db");
      await resetAllPendingCrawls();
      await startCrawler("scheduled");
    }
  }, TWENTY_FOUR_HOURS);

  console.log("[Crawler] 24-hour auto-refresh scheduler started.");
}

// ─── Review Helpers ────────────────────────────────────────────────────────────

function buildReviewSummary(steamData: { positiveReviews?: number; negativeReviews?: number; totalReviews?: number; reviewScoreDesc?: string } | null): string {
  if (!steamData) return "";
  const total = (steamData.positiveReviews ?? 0) + (steamData.negativeReviews ?? 0);
  if (total === 0) return steamData.reviewScoreDesc ?? "";
  const pct = Math.round(((steamData.positiveReviews ?? 0) / total) * 100);
  return `${pct}% of ${total.toLocaleString()} user reviews are positive`;
}

function getReviewType(score: number): string {
  if (score >= 9) return "Overwhelmingly Positive";
  if (score >= 8) return "Very Positive";
  if (score >= 7) return "Mostly Positive";
  if (score >= 6) return "Mixed";
  if (score >= 5) return "Mostly Negative";
  if (score >= 4) return "Very Negative";
  if (score >= 3) return "Overwhelmingly Negative";
  return "No Reviews";
}

export async function getFullCrawlerStatus() {
  const queueStats = await getCrawlQueueStats();
  return {
    ...state,
    queueStats,
  };
}
