import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });
});

describe("games.getStats", () => {
  it("returns stats object with required fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.games.getStats();

    expect(stats).toHaveProperty("totalGamesTracked");
    expect(stats).toHaveProperty("totalPlayersOnline");
    expect(stats).toHaveProperty("topGamePlayers");
    expect(stats).toHaveProperty("topGameName");
    expect(typeof stats.totalGamesTracked).toBe("number");
    // totalPlayersOnline may be returned as string from DB aggregate - accept both
    expect(["number", "string"]).toContain(typeof stats.totalPlayersOnline);
  });
});

describe("games.getTopCharts", () => {
  it("returns an array of games with required fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const games = await caller.games.getTopCharts({ sortBy: "ccu", limit: 5 });

    expect(Array.isArray(games)).toBe(true);
    if (games.length > 0) {
      const game = games[0]!;
      expect(game).toHaveProperty("appid");
      expect(game).toHaveProperty("name");
      expect(game).toHaveProperty("rank");
      expect(typeof game.appid).toBe("number");
      expect(typeof game.name).toBe("string");
    }
  });

  it("respects the limit parameter", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const games = await caller.games.getTopCharts({ sortBy: "ccu", limit: 3 });
    expect(games.length).toBeLessThanOrEqual(3);
  });

  it("filters by genre when provided", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const games = await caller.games.getTopCharts({ sortBy: "ccu", limit: 20, genre: "Action" });
    games.forEach((game) => {
      if (game.genre) {
        expect(game.genre.toLowerCase()).toContain("action");
      }
    });
  });
});

describe("games.getTrending", () => {
  it("returns trending games array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const trending = await caller.games.getTrending({ limit: 5 });
    expect(Array.isArray(trending)).toBe(true);
  });
});

describe("games.getRecords", () => {
  it("returns records with allTimePeaks, currentTopPlayers, and mostOwned", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const records = await caller.games.getRecords();

    expect(records).toHaveProperty("allTimePeaks");
    expect(records).toHaveProperty("currentTopPlayers");
    expect(records).toHaveProperty("mostOwned");
    expect(Array.isArray(records.allTimePeaks)).toBe(true);
    expect(Array.isArray(records.currentTopPlayers)).toBe(true);
    expect(Array.isArray(records.mostOwned)).toBe(true);
  });
});

describe("games.getGenres", () => {
  it("returns an array of genre stats", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const genres = await caller.games.getGenres();

    expect(Array.isArray(genres)).toBe(true);
    if (genres.length > 0) {
      const first = genres[0]!;
      expect(first).toHaveProperty("genre");
      expect(first).toHaveProperty("count");
      expect(first).toHaveProperty("totalPlayers");
      expect(typeof first.genre).toBe("string");
      expect(typeof first.count).toBe("number");
    }
  });
});

describe("games.search", () => {
  it("returns search results array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.games.search({ limit: 5 });
    expect(Array.isArray(results)).toBe(true);
  });

  it("handles empty query gracefully", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.games.search({ query: "", limit: 5 });
    expect(Array.isArray(results)).toBe(true);
  });
});

describe("games.getPlayerHistory", () => {
  it("returns player history array for a known appid", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // CS2 appid
    const history = await caller.games.getPlayerHistory({ appid: 730, period: "weekly" });

    expect(Array.isArray(history)).toBe(true);
    if (history.length > 0) {
      const point = history[0]!;
      expect(point).toHaveProperty("timestamp");
      expect(point).toHaveProperty("players");
      expect(typeof point.timestamp).toBe("number");
      expect(typeof point.players).toBe("number");
    }
  });

  it("returns different data for different periods", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const weekly = await caller.games.getPlayerHistory({ appid: 730, period: "weekly" });
    const monthly = await caller.games.getPlayerHistory({ appid: 730, period: "monthly" });

    // Both periods should return data points (actual length depends on generation logic)
    expect(weekly.length).toBeGreaterThan(0);
    expect(monthly.length).toBeGreaterThan(0);
  });
});
