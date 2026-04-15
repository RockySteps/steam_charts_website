import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getGameByAppid,
  getGamesByGenreFromDb,
  getTopGamesByAllTimePeak,
  getTopGamesByOwnersMax,
  getTopGamesByPlayers,
  getTotalGamesCount,
  getTotalPlayersOnline,
  searchGames,
} from "./db";
import { getAppDetails as getSteamAppDetails } from "./services/steamApi";
import { getAppDetails as getSteamSpyDetails, getGamesByGenre } from "./services/steamSpyApi";
import { generateHistoricalData } from "./services/steamChartsApi";
import { quickSyncTopGames } from "./services/dataSyncService";

// Trigger background sync on startup
let startupSyncDone = false;
async function ensureDataLoaded() {
  if (!startupSyncDone) {
    startupSyncDone = true;
    quickSyncTopGames().catch(console.error);
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  games: router({
    /**
     * Get top games by current concurrent players
     */
    getTopCharts: publicProcedure
      .input(z.object({
        sortBy: z.enum(["ccu", "peakPlayersAllTime", "ownersMax", "averagePlaytimeForever"]).default("ccu"),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        genre: z.string().optional(),
        minPlayers: z.number().optional(),
        maxPlayers: z.number().optional(),
      }))
      .query(async ({ input }) => {
        await ensureDataLoaded();
        let games;
        if (input.sortBy === "peakPlayersAllTime") {
          games = await getTopGamesByAllTimePeak(input.limit + input.offset);
        } else if (input.sortBy === "ownersMax") {
          games = await getTopGamesByOwnersMax(input.limit + input.offset);
        } else {
          games = await getTopGamesByPlayers(input.limit + input.offset);
        }

        // Apply filters
        if (input.genre) {
          games = games.filter((g) => g.genre?.toLowerCase().includes(input.genre!.toLowerCase()));
        }
        if (input.minPlayers !== undefined) {
          games = games.filter((g) => (g.ccu ?? 0) >= input.minPlayers!);
        }
        if (input.maxPlayers !== undefined) {
          games = games.filter((g) => (g.ccu ?? 0) <= input.maxPlayers!);
        }

        return games.slice(input.offset, input.offset + input.limit).map((g, idx) => ({
          ...g,
          rank: input.offset + idx + 1,
        }));
      }),

    /**
     * Get trending games (highest CCU recently)
     */
    getTrending: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(20).default(10) }))
      .query(async ({ input }) => {
        await ensureDataLoaded();
        const games = await getTopGamesByPlayers(input.limit);
        return games;
      }),

    /**
     * Get overview stats
     */
    getStats: publicProcedure.query(async () => {
      await ensureDataLoaded();
      const [totalGames, totalPlayers, topGames] = await Promise.all([
        getTotalGamesCount(),
        getTotalPlayersOnline(),
        getTopGamesByPlayers(1),
      ]);
      return {
        totalGamesTracked: totalGames,
        totalPlayersOnline: totalPlayers,
        topGamePlayers: topGames[0]?.ccu ?? 0,
        topGameName: topGames[0]?.name ?? "",
      };
    }),

    /**
     * Get full game details
     */
    getGameDetail: publicProcedure
      .input(z.object({ appid: z.number() }))
      .query(async ({ input }) => {
        // First check DB cache
        let game = await getGameByAppid(input.appid);

        // If not in cache or stale, fetch from APIs
        if (!game) {
          const [steamDetails, spyDetails] = await Promise.all([
            getSteamAppDetails(input.appid),
            getSteamSpyDetails(input.appid),
          ]);

          if (!steamDetails && !spyDetails) return null;

          const tags = spyDetails?.tags ? Object.keys(spyDetails.tags).slice(0, 15) : [];
          const genres = steamDetails?.genres?.map((g) => g.description) ?? spyDetails?.genre?.split(", ") ?? [];

          return {
            appid: input.appid,
            name: steamDetails?.name ?? spyDetails?.name ?? "",
            developer: steamDetails?.developers?.join(", ") ?? spyDetails?.developer ?? "",
            publisher: steamDetails?.publishers?.join(", ") ?? spyDetails?.publisher ?? "",
            genre: genres.join(", "),
            tags,
            headerImage: steamDetails?.headerImage ?? `https://cdn.cloudflare.steamstatic.com/steam/apps/${input.appid}/header.jpg`,
            capsuleImage: steamDetails?.capsuleImage ?? "",
            priceUsd: steamDetails?.priceUsd ?? (spyDetails?.price ? spyDetails.price / 100 : null),
            originalPriceUsd: steamDetails?.originalPriceUsd ?? null,
            discountPercent: steamDetails?.discountPercent ?? spyDetails?.discount ?? 0,
            isFree: (steamDetails?.isFree || spyDetails?.price === 0) ? 1 : 0,
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
            currentPlayers: spyDetails?.ccu ?? 0,
            peakPlayers: spyDetails?.ccu ?? 0,
            peakPlayersAllTime: spyDetails?.ccu ?? 0,
            averagePlaytimeForever: spyDetails?.averageForever ?? 0,
            averagePlaytime2weeks: spyDetails?.average2weeks ?? 0,
            ownersMin: spyDetails?.ownersMin ?? 0,
            ownersMax: spyDetails?.ownersMax ?? 0,
            ccu: spyDetails?.ccu ?? 0,
            scoreRank: spyDetails?.scoreRank ?? "",
            lastUpdated: new Date(),
            createdAt: new Date(),
            id: 0,
          };
        }

        return game;
      }),

    /**
     * Get historical player count data for a game
     */
    getPlayerHistory: publicProcedure
      .input(z.object({
        appid: z.number(),
        period: z.enum(["daily", "weekly", "monthly", "yearly"]).default("weekly"),
      }))
      .query(async ({ input }) => {
        const game = await getGameByAppid(input.appid);
        const currentPlayers = game?.ccu ?? 1000;
        const peakPlayers = game?.peakPlayersAllTime ?? currentPlayers * 2;

        const historyData = generateHistoricalData(input.appid, currentPlayers, peakPlayers);
        return historyData[input.period];
      }),

    /**
     * Search games with filters
     */
    search: publicProcedure
      .input(z.object({
        query: z.string().optional(),
        genre: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        minPlayers: z.number().optional(),
        maxPlayers: z.number().optional(),
        limit: z.number().min(1).max(100).default(24),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        await ensureDataLoaded();
        return searchGames(input);
      }),

    /**
     * Get games by genre
     */
    getByGenre: publicProcedure
      .input(z.object({ genre: z.string(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        await ensureDataLoaded();
        const dbGames = await getGamesByGenreFromDb(input.genre, input.limit);
        if (dbGames.length >= 10) return dbGames;

        // Fallback to SteamSpy API
        const apiGames = await getGamesByGenre(input.genre);
        return apiGames.slice(0, input.limit).map((g) => ({
          appid: g.appid,
          name: g.name,
          developer: g.developer,
          publisher: g.publisher,
          genre: g.genre,
          tags: Object.keys(g.tags ?? {}).slice(0, 10),
          headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
          capsuleImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/capsule_231x87.jpg`,
          priceUsd: g.price > 0 ? g.price / 100 : null,
          originalPriceUsd: null,
          discountPercent: g.discount,
          isFree: g.price === 0 ? 1 : 0,
          releaseDate: "",
          reviewScore: 0,
          reviewScoreDesc: "",
          totalReviews: 0,
          positiveReviews: 0,
          negativeReviews: 0,
          metacriticScore: null,
          shortDescription: "",
          website: null,
          platforms: null,
          screenshots: null,
          background: "",
          currentPlayers: g.ccu,
          peakPlayers: g.ccu,
          peakPlayersAllTime: g.ccu,
          averagePlaytimeForever: g.averageForever,
          averagePlaytime2weeks: g.average2weeks,
          ownersMin: g.ownersMin,
          ownersMax: g.ownersMax,
          ccu: g.ccu,
          scoreRank: g.scoreRank,
          lastUpdated: new Date(),
          createdAt: new Date(),
          id: 0,
        }));
      }),

    /**
     * Get all-time records and trending data
     */
    getRecords: publicProcedure.query(async () => {
      await ensureDataLoaded();
      const [byPeak, byPlayers, byOwners] = await Promise.all([
        getTopGamesByAllTimePeak(10),
        getTopGamesByPlayers(10),
        getTopGamesByOwnersMax(10),
      ]);
      return {
        allTimePeaks: byPeak,
        currentTopPlayers: byPlayers,
        mostOwned: byOwners,
      };
    }),

    /**
     * Compare multiple games side by side
     */
    compareGames: publicProcedure
      .input(z.object({ appids: z.array(z.number()).min(2).max(4) }))
      .query(async ({ input }) => {
        const games = await Promise.all(
          input.appids.map(async (appid) => {
            const game = await getGameByAppid(appid);
            if (!game) return null;
            const history = generateHistoricalData(appid, game.ccu ?? 0, game.peakPlayersAllTime ?? 0);
            return { ...game, history: history.monthly };
          })
        );
        return games.filter(Boolean);
      }),

    /**
     * Get available genres with game counts
     */
    getGenres: publicProcedure.query(async () => {
      await ensureDataLoaded();
      const games = await getTopGamesByPlayers(200);
      const genreMap = new Map<string, { count: number; totalPlayers: number; topGame: typeof games[0] | null }>();

      for (const game of games) {
        const genres = (game.genre ?? "").split(", ").filter(Boolean);
        for (const genre of genres) {
          if (!genre || genre.length < 2) continue;
          const existing = genreMap.get(genre) ?? { count: 0, totalPlayers: 0, topGame: null };
          existing.count++;
          existing.totalPlayers += game.ccu ?? 0;
          if (!existing.topGame || (game.ccu ?? 0) > (existing.topGame.ccu ?? 0)) {
            existing.topGame = game;
          }
          genreMap.set(genre, existing);
        }
      }

      return Array.from(genreMap.entries())
        .map(([genre, data]) => ({ genre, ...data }))
        .sort((a, b) => b.totalPlayers - a.totalPlayers)
        .slice(0, 20);
    }),

    /**
     * Trigger a manual data refresh
     */
    refreshData: publicProcedure.mutation(async () => {
      quickSyncTopGames().catch(console.error);
      return { started: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
