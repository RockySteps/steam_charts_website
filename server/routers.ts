import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import {
  getGameByAppid,
  getGamesByGenreFromDb,
  getMonthlyStatsByAppid,
  getRecentCrawlLogs,
  getTopGamesByAllTimePeak,
  getTopGamesByOwnersMax,
  getTopGamesByPlayers,
  getTotalGamesCount,
  getTotalPlayersOnline,
  getCrawlQueueStats,
  getCrawlQueuePage,
  searchGames,
} from "./db";
import { getAppDetails as getSteamAppDetails, getCurrentPlayers } from "./services/steamApi";
import { getAppDetails as getSteamSpyDetails, getGamesByGenre } from "./services/steamSpyApi";
import { generateHistoricalData } from "./services/steamChartsApi";
import {
  initializeCrawler,
  startCrawler,
  stopCrawler,
  pauseCrawler,
  resumeCrawler,
  getFullCrawlerStatus,
  crawlSingleGame,
  generateMonthlyStats,
} from "./services/crawlerService";

// ─── Startup Initialization ────────────────────────────────────────────────────

let startupDone = false;
async function ensureStartup() {
  if (!startupDone) {
    startupDone = true;
    // Initialize the 13K crawler (seeds queue, sets priorities, starts crawl)
    initializeCrawler().catch(console.error);
  }
}

// Kick off on module load
ensureStartup().catch(console.error);

// ─── Router ────────────────────────────────────────────────────────────────────

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

  // ─── Games Router ────────────────────────────────────────────────────────────

  games: router({
    getTopCharts: publicProcedure
      .input(z.object({
        sortBy: z.enum(["ccu", "peakPlayersAllTime", "ownersMax", "averagePlaytimeForever"]).default("ccu"),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
        genre: z.string().optional(),
        minPlayers: z.number().optional(),
        maxPlayers: z.number().optional(),
      }))
      .query(async ({ input }) => {
        let games;
        if (input.sortBy === "peakPlayersAllTime") {
          games = await getTopGamesByAllTimePeak(input.limit + input.offset + 100);
        } else if (input.sortBy === "ownersMax") {
          games = await getTopGamesByOwnersMax(input.limit + input.offset + 100);
        } else {
          games = await getTopGamesByPlayers(input.limit + input.offset + 100);
        }

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

    getTrending: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(20).default(10) }))
      .query(async ({ input }) => {
        return getTopGamesByPlayers(input.limit);
      }),

    getStats: publicProcedure.query(async () => {
      const [totalGames, totalPlayers, topGames, queueStats] = await Promise.all([
        getTotalGamesCount(),
        getTotalPlayersOnline(),
        getTopGamesByPlayers(1),
        getCrawlQueueStats(),
      ]);
      return {
        totalGamesTracked: totalGames,
        totalPlayersOnline: totalPlayers,
        topGamePlayers: topGames[0]?.ccu ?? 0,
        topGameName: topGames[0]?.name ?? "",
        totalInQueue: queueStats.total,
        queueDone: queueStats.done,
      };
    }),

    getGameDetail: publicProcedure
      .input(z.object({ appid: z.number() }))
      .query(async ({ input }) => {
        let game = await getGameByAppid(input.appid);

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
            capsuleImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${input.appid}/capsule_231x87.jpg`,
            priceUsd: steamDetails?.priceUsd ?? (spyDetails?.price ? spyDetails.price / 100 : null),
            originalPriceUsd: steamDetails?.originalPriceUsd ?? null,
            discountPercent: steamDetails?.discountPercent ?? spyDetails?.discount ?? 0,
            isFree: (steamDetails?.isFree || spyDetails?.price === 0) ? 1 : 0,
            releaseDate: steamDetails?.releaseDate ?? "",
            reviewScore: steamDetails?.reviewScore ?? 0,
            reviewScoreDesc: steamDetails?.reviewScoreDesc ?? "",
            reviewSummary: null as string | null,
            reviewType: null as string | null,
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
     * Get monthly stats table (Avg Players, Gain, % Gain, Peak Players per month)
     */
    getMonthlyStats: publicProcedure
      .input(z.object({ appid: z.number(), limit: z.number().min(1).max(60).default(24) }))
      .query(async ({ input }) => {
        const dbStats = await getMonthlyStatsByAppid(input.appid, input.limit);

        if (dbStats.length > 0) {
          return dbStats.map((s) => ({
            year: s.year,
            month: s.month,
            avgPlayers: s.avgPlayers ?? 0,
            peakPlayers: s.peakPlayers ?? 0,
            minPlayers: s.minPlayers ?? 0,
            gain: s.gain ?? 0,
            gainPercent: s.gainPercent ?? 0,
            dataPoints: s.dataPoints ?? 0,
          }));
        }

        // Generate synthetic monthly stats from historical data
        const game = await getGameByAppid(input.appid);
        const currentPlayers = game?.ccu ?? 500;
        const peakPlayers = game?.peakPlayersAllTime ?? currentPlayers * 3;
        const historyData = generateHistoricalData(input.appid, currentPlayers, peakPlayers);

        // Aggregate monthly data from the yearly view
        const yearlyPoints = historyData.yearly;
        const monthlyResult: Array<{
          year: number; month: number; avgPlayers: number; peakPlayers: number;
          minPlayers: number; gain: number; gainPercent: number; dataPoints: number;
        }> = [];

        const now = new Date();
        for (let i = 0; i < Math.min(input.limit, 24); i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const year = d.getFullYear();
          const month = d.getMonth() + 1;

          // Find nearby data point
          const nearestPoint = yearlyPoints.reduce((best, pt) => {
            const ptDate = new Date(pt.timestamp);
            const ptDiff = Math.abs(ptDate.getTime() - d.getTime());
            const bestDate = new Date(best.timestamp);
            const bestDiff = Math.abs(bestDate.getTime() - d.getTime());
            return ptDiff < bestDiff ? pt : best;
          }, yearlyPoints[0]!);

          const avg = nearestPoint?.players ?? currentPlayers;
          const peak = Math.round(avg * (1 + Math.random() * 0.3));
          const min = Math.round(avg * (0.6 + Math.random() * 0.2));

          monthlyResult.push({ year, month, avgPlayers: avg, peakPlayers: peak, minPlayers: min, gain: 0, gainPercent: 0, dataPoints: 30 });
        }

        // Calculate gain vs previous month
        for (let i = 0; i < monthlyResult.length - 1; i++) {
          const curr = monthlyResult[i]!;
          const prev = monthlyResult[i + 1]!;
          curr.gain = Math.round((curr.avgPlayers - prev.avgPlayers) * 10) / 10;
          curr.gainPercent = prev.avgPlayers > 0
            ? Math.round(((curr.avgPlayers - prev.avgPlayers) / prev.avgPlayers) * 10000) / 100
            : 0;
        }

        return monthlyResult;
      }),

    /**
     * Get Steam user reviews for a game (from official Steam API)
     */
    getReviews: publicProcedure
      .input(z.object({
        appid: z.number(),
        filter: z.enum(["all", "positive", "negative", "recent"]).default("all"),
        numPerPage: z.number().min(1).max(20).default(10),
      }))
      .query(async ({ input }) => {
        try {
          const filterParam = input.filter === "recent" ? "recent" : "all";
          const reviewFilter = input.filter === "positive" ? "positive" :
            input.filter === "negative" ? "negative" : "all";

          const url = `https://store.steampowered.com/appreviews/${input.appid}?json=1&filter=${filterParam}&language=english&review_type=${reviewFilter}&purchase_type=all&num_per_page=${input.numPerPage}&cursor=*`;
          const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!res.ok) return { reviews: [], summary: null };

          const data = await res.json() as {
            success: number;
            query_summary?: {
              num_reviews: number;
              review_score: number;
              review_score_desc: string;
              total_positive: number;
              total_negative: number;
              total_reviews: number;
            };
            reviews?: Array<{
              recommendationid: string;
              author: { steamid: string; num_reviews: number; playtime_forever: number };
              language: string;
              review: string;
              timestamp_created: number;
              voted_up: boolean;
              votes_up: number;
              votes_funny: number;
              weighted_vote_score: string;
              comment_count: number;
              steam_purchase: boolean;
              received_for_free: boolean;
              written_during_early_access: boolean;
            }>;
          };

          if (!data.success) return { reviews: [], summary: null };

          return {
            summary: data.query_summary ? {
              totalReviews: data.query_summary.total_reviews,
              totalPositive: data.query_summary.total_positive,
              totalNegative: data.query_summary.total_negative,
              reviewScore: data.query_summary.review_score,
              reviewScoreDesc: data.query_summary.review_score_desc,
              positivePercent: data.query_summary.total_reviews > 0
                ? Math.round((data.query_summary.total_positive / data.query_summary.total_reviews) * 100)
                : 0,
            } : null,
            reviews: (data.reviews ?? []).map((r) => ({
              id: r.recommendationid,
              authorPlaytime: Math.round((r.author?.playtime_forever ?? 0) / 60),
              language: r.language,
              review: r.review?.slice(0, 500) ?? "",
              createdAt: r.timestamp_created,
              isPositive: r.voted_up,
              votesUp: r.votes_up,
              votesFunny: r.votes_funny,
              steamPurchase: r.steam_purchase,
            })),
          };
        } catch {
          return { reviews: [], summary: null };
        }
      }),

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
        return searchGames(input);
      }),

    getByGenre: publicProcedure
      .input(z.object({ genre: z.string(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        const dbGames = await getGamesByGenreFromDb(input.genre, input.limit);
        if (dbGames.length >= 10) return dbGames;

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
          reviewSummary: null as string | null,
          reviewType: null as string | null,
          totalReviews: 0,
          positiveReviews: 0,
          negativeReviews: 0,
          metacriticScore: null as number | null,
          shortDescription: "",
          website: null as string | null,
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

    getRecords: publicProcedure.query(async () => {
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

    getGenres: publicProcedure.query(async () => {
      const games = await getTopGamesByPlayers(500);
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
        .slice(0, 30);
    }),

    /**
     * Trigger a manual data refresh for a specific game (public, rate-limited by client)
     */
    triggerUpdate: publicProcedure
      .input(z.object({ appid: z.number() }))
      .mutation(async ({ input }) => {
        // Run in background
        crawlSingleGame(input.appid)
          .then(() => generateMonthlyStats(input.appid))
          .catch(console.error);
        return { queued: true };
      }),

    /**
     * Trigger refresh of top charts data
     */
    refreshData: publicProcedure.mutation(async () => {
      if (!(await getFullCrawlerStatus()).isRunning) {
        startCrawler("manual").catch(console.error);
      }
      return { started: true };
    }),
  }),

  // ─── Admin Router ─────────────────────────────────────────────────────────────

  admin: router({
    /**
     * Get full crawler status + queue stats
     */
    getCrawlerStatus: adminProcedure.query(async () => {
      return getFullCrawlerStatus();
    }),

    /**
     * Start the crawler
     */
    startCrawler: adminProcedure.mutation(async () => {
      const jobId = await startCrawler("admin");
      return { jobId, started: true };
    }),

    /**
     * Stop the crawler
     */
    stopCrawler: adminProcedure.mutation(async () => {
      await stopCrawler();
      return { stopped: true };
    }),

    /**
     * Pause the crawler
     */
    pauseCrawler: adminProcedure.mutation(async () => {
      await pauseCrawler();
      return { paused: true };
    }),

    /**
     * Resume the crawler
     */
    resumeCrawler: adminProcedure.mutation(async () => {
      await resumeCrawler();
      return { resumed: true };
    }),

    /**
     * Force refresh a single game
     */
    refreshGame: adminProcedure
      .input(z.object({ appid: z.number() }))
      .mutation(async ({ input }) => {
        const success = await crawlSingleGame(input.appid);
        if (success) await generateMonthlyStats(input.appid);
        return { success };
      }),

    /**
     * Get crawl job history
     */
    getCrawlLogs: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
      .query(async ({ input }) => {
        return getRecentCrawlLogs(input.limit);
      }),

    /**
     * Get crawl queue page for game management table
     */
    getQueuePage: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return getCrawlQueuePage(input);
      }),

    /**
     * Get site-wide stats for admin dashboard
     */
    getSiteStats: adminProcedure.query(async () => {
      const [totalGames, totalPlayers, topGames, queueStats, recentLogs] = await Promise.all([
        getTotalGamesCount(),
        getTotalPlayersOnline(),
        getTopGamesByPlayers(5),
        getCrawlQueueStats(),
        getRecentCrawlLogs(1),
      ]);

      const lastCrawl = recentLogs[0];
      const crawlerStatus = await getFullCrawlerStatus();

      return {
        totalGames,
        totalPlayers,
        topGames,
        queueStats,
        lastCrawlAt: lastCrawl?.startedAt ?? null,
        lastCrawlStatus: lastCrawl?.status ?? null,
        crawlerRunning: crawlerStatus.isRunning,
        crawlerPaused: crawlerStatus.isPaused,
        processedToday: crawlerStatus.processedCount,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
