/**
 * Tests for Phase 7 Steam features:
 * - getPriceByCountry
 * - getTopSellers
 * - getNewReleases
 * - getUpcomingGames
 * - getSteamLiveStats
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mock steamApi module ──────────────────────────────────────────────────────
vi.mock("./services/steamApi", () => ({
  getAppDetails: vi.fn(),
  getCurrentPlayers: vi.fn().mockResolvedValue(1000),
  getGameNews: vi.fn(),
  getGameReviews: vi.fn(),
  getPriceByCountry: vi.fn(),
  getFeaturedCategories: vi.fn(),
  getFullSteamAppList: vi.fn().mockResolvedValue([]),
}));

vi.mock("./services/steamSpyApi", () => ({
  getAppDetails: vi.fn(),
  getGamesByGenre: vi.fn(),
}));

vi.mock("./services/steamChartsApi", () => ({
  generateHistoricalData: vi.fn(),
  generateMonthlyStatsFromHistory: vi.fn(),
}));

vi.mock("./services/crawlerService", () => ({
  initializeCrawler: vi.fn(),
  startCrawler: vi.fn(),
  stopCrawler: vi.fn(),
  pauseCrawler: vi.fn(),
  resumeCrawler: vi.fn(),
  getFullCrawlerStatus: vi.fn().mockResolvedValue({ isRunning: false }),
  crawlSingleGame: vi.fn(),
  generateMonthlyStats: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getTopGamesByPlayers: vi.fn().mockResolvedValue([
      { appid: 730, name: "Counter-Strike 2", ccu: 1000000, peakPlayersAllTime: 1500000, genre: "Action" },
    ]),
    getTopGamesByAllTimePeak: vi.fn().mockResolvedValue([]),
    getTopGamesByOwnersMax: vi.fn().mockResolvedValue([]),
    getTotalGamesCount: vi.fn().mockResolvedValue(10000),
    getTotalPlayersOnline: vi.fn().mockResolvedValue(5000000),
    getCrawlQueueStats: vi.fn().mockResolvedValue({ total: 100, done: 50, pending: 50, processing: 0, failed: 0 }),
    getCrawlQueuePage: vi.fn().mockResolvedValue([]),
    getRecentCrawlLogs: vi.fn().mockResolvedValue([]),
    searchGames: vi.fn().mockResolvedValue([]),
    getTrendingNow: vi.fn().mockResolvedValue([]),
    getGameByAppid: vi.fn().mockResolvedValue(null),
    getMonthlyStatsByAppid: vi.fn().mockResolvedValue([]),
    getGamesByGenreFromDb: vi.fn().mockResolvedValue([]),
    getGamesByGenreCount: vi.fn().mockResolvedValue(0),
  };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getPriceByCountry, getFeaturedCategories, getCurrentPlayers } from "./services/steamApi";
import { getTopGamesByPlayers } from "./db";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("games.getPriceByCountry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns price info for a valid appid and country", async () => {
    const mockPrice = {
      currency: "USD",
      initial: 2999,
      final: 2999,
      discountPercent: 0,
      initialFormatted: "$29.99",
      finalFormatted: "$29.99",
      isFree: false,
    };
    vi.mocked(getPriceByCountry).mockResolvedValue(mockPrice);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getPriceByCountry({ appid: 730, cc: "us" });

    expect(result).not.toBeNull();
    expect(result?.currency).toBe("USD");
    expect(result?.isFree).toBe(false);
    expect(result?.discountPercent).toBe(0);
  });

  it("returns null when price data is unavailable", async () => {
    vi.mocked(getPriceByCountry).mockResolvedValue(null);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getPriceByCountry({ appid: 99999999, cc: "us" });

    expect(result).toBeNull();
  });

  it("returns free price info for free games", async () => {
    const mockFreePrice = {
      currency: "USD",
      initial: 0,
      final: 0,
      discountPercent: 0,
      initialFormatted: "Free",
      finalFormatted: "Free",
      isFree: true,
    };
    vi.mocked(getPriceByCountry).mockResolvedValue(mockFreePrice);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getPriceByCountry({ appid: 570, cc: "us" });

    expect(result?.isFree).toBe(true);
    expect(result?.finalFormatted).toBe("Free");
  });
});

describe("games.getTopSellers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns top sellers list", async () => {
    const mockFeatured = {
      topSellers: [
        { id: 730, name: "Counter-Strike 2", discounted: false, discountPercent: 0, originalPrice: 0, finalPrice: 0, currency: "USD", largeHeaderImage: "", smallHeaderImage: "", headerImage: "", capsuleImage: "" },
        { id: 570, name: "Dota 2", discounted: false, discountPercent: 0, originalPrice: 0, finalPrice: 0, currency: "USD", largeHeaderImage: "", smallHeaderImage: "", headerImage: "", capsuleImage: "" },
      ],
      newReleases: [],
      comingSoon: [],
    };
    vi.mocked(getFeaturedCategories).mockResolvedValue(mockFeatured);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getTopSellers({ cc: "us" });

    expect(result).not.toBeNull();
    expect(result?.games).toHaveLength(2);
    expect(result?.games[0]?.name).toBe("Counter-Strike 2");
  });
});

describe("games.getNewReleases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns new releases list", async () => {
    const mockFeatured = {
      topSellers: [],
      newReleases: [
        { id: 12345, name: "New Game 1", discounted: false, discountPercent: 0, originalPrice: 1999, finalPrice: 1999, currency: "USD", largeHeaderImage: "", smallHeaderImage: "", headerImage: "", capsuleImage: "" },
      ],
      comingSoon: [],
    };
    vi.mocked(getFeaturedCategories).mockResolvedValue(mockFeatured);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getNewReleases({ cc: "us" });

    expect(result).not.toBeNull();
    expect(result?.games).toHaveLength(1);
    expect(result?.games[0]?.name).toBe("New Game 1");
  });
});

describe("games.getUpcomingGames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns upcoming games list with pagination", async () => {
    const mockFeatured = {
      topSellers: [],
      newReleases: [],
      comingSoon: [
        { id: 99001, name: "Upcoming Game 1", discounted: false, discountPercent: 0, originalPrice: null, finalPrice: null, currency: "USD", largeHeaderImage: "", smallHeaderImage: "", headerImage: "https://cdn.cloudflare.steamstatic.com/steam/apps/99001/header.jpg", capsuleImage: "" },
        { id: 99002, name: "Upcoming Game 2", discounted: false, discountPercent: 0, originalPrice: null, finalPrice: null, currency: "USD", largeHeaderImage: "", smallHeaderImage: "", headerImage: "", capsuleImage: "" },
      ],
    };
    vi.mocked(getFeaturedCategories).mockResolvedValue(mockFeatured);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getUpcomingGames({ cc: "us", limit: 50, offset: 0 });

    expect(result).not.toBeNull();
    expect(result?.total).toBe(2);
    expect(result?.games).toHaveLength(2);
    expect(result?.games[0]?.name).toBe("Upcoming Game 1");
  });

  it("supports pagination via offset and limit", async () => {
    const allGames = Array.from({ length: 10 }, (_, i) => ({
      id: 90000 + i,
      name: `Game ${i + 1}`,
      discounted: false,
      discountPercent: 0,
      originalPrice: null,
      finalPrice: null,
      currency: "USD",
      largeHeaderImage: "",
      smallHeaderImage: "",
      headerImage: "",
      capsuleImage: "",
    }));

    vi.mocked(getFeaturedCategories).mockResolvedValue({
      topSellers: [],
      newReleases: [],
      comingSoon: allGames,
    });

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getUpcomingGames({ cc: "us", limit: 5, offset: 5 });

    expect(result?.total).toBe(10);
    expect(result?.games).toHaveLength(5);
    expect(result?.games[0]?.name).toBe("Game 6");
  });
});

describe("games.getSteamLiveStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns worldwide player count and top games", async () => {
    vi.mocked(getCurrentPlayers).mockImplementation(async (appid: number) => {
      if (appid === 0) return 7_300_000; // worldwide
      return 1_000_000; // per game
    });

    vi.mocked(getTopGamesByPlayers).mockResolvedValue([
      { appid: 730, name: "Counter-Strike 2", ccu: 900000, peakPlayersAllTime: 1500000, genre: "Action" },
      { appid: 570, name: "Dota 2", ccu: 700000, peakPlayersAllTime: 1200000, genre: "Strategy" },
    ] as Parameters<typeof getTopGamesByPlayers>[0] extends number ? Awaited<ReturnType<typeof getTopGamesByPlayers>> : never);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getSteamLiveStats({ cc: "us" });

    expect(result).not.toBeNull();
    expect(result.worldwidePlayers).toBeGreaterThan(0);
    expect(result.topGames).toHaveLength(2);
    expect(result.topGames[0]?.name).toBe("Counter-Strike 2");
  });
});
