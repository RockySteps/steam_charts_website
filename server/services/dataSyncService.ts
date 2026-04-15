/**
 * Data Sync Service
 * Fetches data from Steam/SteamSpy APIs and populates the database cache
 * Runs on startup and periodically to keep data fresh
 */

import { upsertGameCache } from "../db";
import { getTop100In2Weeks, getTop100Forever } from "./steamSpyApi";
import { getAppDetails as getSteamAppDetails } from "./steamApi";

let syncInProgress = false;
let lastSyncTime = 0;
const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export async function syncTopGames(): Promise<void> {
  if (syncInProgress) return;
  const now = Date.now();
  if (now - lastSyncTime < SYNC_INTERVAL_MS) return;

  syncInProgress = true;
  lastSyncTime = now;
  console.log("[DataSync] Starting top games sync...");

  try {
    // Fetch top 100 games from SteamSpy
    const [top2weeks, topForever] = await Promise.all([
      getTop100In2Weeks(),
      getTop100Forever(),
    ]);

    // Merge and deduplicate
    const allGames = new Map<number, typeof top2weeks[0]>();
    for (const g of [...top2weeks, ...topForever]) {
      if (!allGames.has(g.appid)) allGames.set(g.appid, g);
    }

    // Build a map of all-time peaks from topForever
    const foreverMap = new Map(topForever.map((g) => [g.appid, g.ccu]));

    console.log(`[DataSync] Syncing ${allGames.size} games...`);

    let count = 0;
    for (const [appid, game] of Array.from(allGames.entries())) {
      try {
        // Try to get Steam store details for richer metadata
        const steamDetails = await getSteamAppDetails(appid).catch(() => null);

        const tags = game.tags ? Object.keys(game.tags).slice(0, 10) : [];
        const genres = steamDetails?.genres?.map((g) => g.description) ?? game.genre.split(", ").filter(Boolean);

        await upsertGameCache({
          appid,
          name: steamDetails?.name ?? game.name,
          developer: steamDetails?.developers?.join(", ") ?? game.developer,
          publisher: steamDetails?.publishers?.join(", ") ?? game.publisher,
          genre: genres.join(", "),
          tags: tags,
          headerImage: steamDetails?.headerImage ?? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
          capsuleImage: steamDetails?.capsuleImage ?? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_231x87.jpg`,
          priceUsd: steamDetails?.priceUsd ?? (game.price > 0 ? game.price / 100 : null),
          originalPriceUsd: steamDetails?.originalPriceUsd ?? (game.initialPrice > 0 ? game.initialPrice / 100 : null),
          discountPercent: steamDetails?.discountPercent ?? game.discount,
          isFree: (steamDetails?.isFree || game.price === 0) ? 1 : 0,
          releaseDate: steamDetails?.releaseDate ?? "",
          reviewScore: steamDetails?.reviewScore ?? 0,
          reviewScoreDesc: steamDetails?.reviewScoreDesc ?? "",
          totalReviews: steamDetails?.totalReviews ?? 0,
          positiveReviews: steamDetails?.positiveReviews ?? 0,
          negativeReviews: steamDetails?.negativeReviews ?? 0,
          metacriticScore: steamDetails?.metacriticScore ?? null,
          shortDescription: steamDetails?.shortDescription ?? "",
          website: steamDetails?.website ?? null,
          platforms: steamDetails?.platforms ?? { windows: true, mac: false, linux: false },
          screenshots: steamDetails?.screenshots ?? [],
          background: steamDetails?.background ?? "",
          currentPlayers: game.ccu,
          peakPlayers: game.ccu,
          peakPlayersAllTime: foreverMap.get(appid) ?? game.ccu,
          averagePlaytimeForever: game.averageForever,
          averagePlaytime2weeks: game.average2weeks,
          ownersMin: game.ownersMin,
          ownersMax: game.ownersMax,
          ccu: game.ccu,
          scoreRank: game.scoreRank,
        });

        count++;
        // Small delay to avoid hammering Steam API
        if (count % 5 === 0) await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        console.error(`[DataSync] Failed to sync appid ${appid}:`, e);
      }
    }

    console.log(`[DataSync] Sync complete. Synced ${count} games.`);
  } catch (e) {
    console.error("[DataSync] Sync failed:", e);
  } finally {
    syncInProgress = false;
  }
}

/**
 * Quick sync - only SteamSpy data, no Steam API calls (faster)
 */
export async function quickSyncTopGames(): Promise<void> {
  if (syncInProgress) return;
  syncInProgress = true;
  console.log("[DataSync] Quick sync starting...");

  try {
    const top2weeks = await getTop100In2Weeks();
    for (const game of top2weeks) {
      const tags = game.tags ? Object.keys(game.tags).slice(0, 10) : [];
      await upsertGameCache({
        appid: game.appid,
        name: game.name,
        developer: game.developer,
        publisher: game.publisher,
        genre: game.genre,
        tags,
        headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
        capsuleImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/capsule_231x87.jpg`,
        priceUsd: game.price > 0 ? game.price / 100 : null,
        originalPriceUsd: game.initialPrice > 0 ? game.initialPrice / 100 : null,
        discountPercent: game.discount,
        isFree: game.price === 0 ? 1 : 0,
        currentPlayers: game.ccu,
        peakPlayers: game.ccu,
        peakPlayersAllTime: game.ccu,
        averagePlaytimeForever: game.averageForever,
        averagePlaytime2weeks: game.average2weeks,
        ownersMin: game.ownersMin,
        ownersMax: game.ownersMax,
        ccu: game.ccu,
        scoreRank: game.scoreRank,
      });
    }
    console.log(`[DataSync] Quick sync done. ${top2weeks.length} games.`);
  } catch (e) {
    console.error("[DataSync] Quick sync failed:", e);
  } finally {
    syncInProgress = false;
    lastSyncTime = Date.now();
  }
}
