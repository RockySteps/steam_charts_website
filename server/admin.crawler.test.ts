/**
 * Admin & Crawler Procedure Tests
 * Covers: admin auth guard, crawler control, site stats, queue, logs, triggerUpdate, getMonthlyStats, getReviews
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Context Factories ────────────────────────────────────────────────────────

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Admin Auth Guard Tests ───────────────────────────────────────────────────

describe("admin procedures - auth guard", () => {
  it("getCrawlerStatus: rejects unauthenticated users with UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.admin.getCrawlerStatus()).rejects.toThrow(TRPCError);
  });

  it("getCrawlerStatus: rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.getCrawlerStatus()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("startCrawler: rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.startCrawler()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("stopCrawler: rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.stopCrawler()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("pauseCrawler: rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.pauseCrawler()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("resumeCrawler: rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.resumeCrawler()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refreshGame: rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.refreshGame({ appid: 730 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("getCrawlLogs: rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.getCrawlLogs({ limit: 5 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("getQueuePage: rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.getQueuePage({ limit: 10, offset: 0 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("getSiteStats: rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.getSiteStats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ─── Admin Procedure Tests (as admin) ────────────────────────────────────────

describe("admin procedures - as admin", () => {
  it("getCrawlerStatus: returns status object with required fields", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const status = await caller.admin.getCrawlerStatus();
    expect(status).toHaveProperty("isRunning");
    expect(status).toHaveProperty("isPaused");
    expect(status).toHaveProperty("processedCount");
    expect(status).toHaveProperty("failedCount");
    expect(typeof status.isRunning).toBe("boolean");
    expect(typeof status.isPaused).toBe("boolean");
  });

  it("getCrawlLogs: returns an array", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const logs = await caller.admin.getCrawlLogs({ limit: 5 });
    expect(Array.isArray(logs)).toBe(true);
  });

  it("getQueuePage: returns an array with correct shape", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const page = await caller.admin.getQueuePage({ limit: 10, offset: 0 });
    expect(Array.isArray(page)).toBe(true);
    if (page.length > 0) {
      expect(page[0]).toHaveProperty("appid");
      expect(page[0]).toHaveProperty("status");
      expect(page[0]).toHaveProperty("priority");
    }
  });

  it("getQueuePage: filters by status correctly", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const pendingPage = await caller.admin.getQueuePage({ limit: 10, offset: 0, status: "pending" });
    expect(Array.isArray(pendingPage)).toBe(true);
    for (const item of pendingPage) {
      expect(item.status).toBe("pending");
    }
  });

  it("getSiteStats: returns stats with required fields", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const stats = await caller.admin.getSiteStats();
    expect(stats).toHaveProperty("totalGames");
    expect(stats).toHaveProperty("totalPlayers");
    expect(stats).toHaveProperty("topGames");
    expect(stats).toHaveProperty("queueStats");
    expect(Array.isArray(stats.topGames)).toBe(true);
    expect(stats.queueStats).toHaveProperty("total");
    expect(stats.queueStats).toHaveProperty("done");
    expect(stats.queueStats).toHaveProperty("pending");
    expect(stats.queueStats).toHaveProperty("failed");
  });

  it("stopCrawler: returns stopped: true", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.stopCrawler();
    expect(result).toEqual({ stopped: true });
  });

  it("pauseCrawler: returns paused: true", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.pauseCrawler();
    expect(result).toEqual({ paused: true });
  });

  it("resumeCrawler: returns resumed: true", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.resumeCrawler();
    expect(result).toEqual({ resumed: true });
  });
});

// ─── Public Crawler Endpoints ─────────────────────────────────────────────────

describe("games.triggerUpdate", () => {
  it("returns queued: true for any appid", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.triggerUpdate({ appid: 730 });
    expect(result).toEqual({ queued: true });
  });

  it("works for unauthenticated users (public endpoint)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.triggerUpdate({ appid: 570 });
    expect(result.queued).toBe(true);
  });
});

describe("games.refreshData", () => {
  it("returns started: true", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.refreshData();
    expect(result).toHaveProperty("started");
    expect(typeof result.started).toBe("boolean");
  });
});

// ─── Monthly Stats ────────────────────────────────────────────────────────────

describe("games.getMonthlyStats", () => {
  it("returns an array for any appid", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const stats = await caller.games.getMonthlyStats({ appid: 730, limit: 12 });
    expect(Array.isArray(stats)).toBe(true);
  });

  it("returns at most the requested limit", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const stats = await caller.games.getMonthlyStats({ appid: 730, limit: 6 });
    expect(stats.length).toBeLessThanOrEqual(6);
  });

  it("monthly stats items have correct shape when data exists", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const stats = await caller.games.getMonthlyStats({ appid: 730, limit: 24 });
    if (stats.length > 0) {
      const item = stats[0]!;
      expect(item).toHaveProperty("year");
      expect(item).toHaveProperty("month");
      expect(item).toHaveProperty("avgPlayers");
      expect(item).toHaveProperty("peakPlayers");
    }
  });
});

// ─── Steam Reviews ────────────────────────────────────────────────────────────

describe("games.getReviews", () => {
  it("returns reviews and summary for a known game", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getReviews({ appid: 730, filter: "all", numPerPage: 5 });
    expect(result).toHaveProperty("reviews");
    expect(Array.isArray(result.reviews)).toBe(true);
  }, 15000);

  it("accepts positive filter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getReviews({ appid: 730, filter: "positive", numPerPage: 3 });
    expect(Array.isArray(result.reviews)).toBe(true);
  }, 15000);

  it("accepts recent filter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getReviews({ appid: 730, filter: "recent", numPerPage: 3 });
    expect(Array.isArray(result.reviews)).toBe(true);
  }, 15000);
});

// ─── Trending Now ─────────────────────────────────────────────────────────────

describe("games.getTrendingNow", () => {
  it("returns an array for gainers type", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getTrendingNow({ type: "gainers", limit: 10, minCcu: 0 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns an array for losers type", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getTrendingNow({ type: "losers", limit: 10, minCcu: 0 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns an array for all type", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getTrendingNow({ type: "all", limit: 20, minCcu: 0 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("respects the limit parameter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getTrendingNow({ type: "all", limit: 5, minCcu: 0 });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("each item has the required shape", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getTrendingNow({ type: "all", limit: 5, minCcu: 0 });
    if (result.length > 0) {
      const item = result[0]!;
      expect(item).toHaveProperty("rank");
      expect(item).toHaveProperty("appid");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("ccu");
      expect(item).toHaveProperty("prevCcu");
      expect(item).toHaveProperty("change");
      expect(item).toHaveProperty("changePct");
      expect(item).toHaveProperty("headerImage");
      expect(typeof item.rank).toBe("number");
      expect(typeof item.appid).toBe("number");
      expect(typeof item.change).toBe("number");
      expect(typeof item.changePct).toBe("number");
    }
  });

  it("gainers have non-negative change values", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getTrendingNow({ type: "gainers", limit: 20, minCcu: 0 });
    for (const item of result) {
      expect(item.change).toBeGreaterThanOrEqual(0);
    }
  });

  it("losers have non-positive change values", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getTrendingNow({ type: "losers", limit: 20, minCcu: 0 });
    for (const item of result) {
      expect(item.change).toBeLessThanOrEqual(0);
    }
  });

  it("ranks are sequential starting from 1", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getTrendingNow({ type: "all", limit: 10, minCcu: 0 });
    result.forEach((item, idx) => {
      expect(item.rank).toBe(idx + 1);
    });
  });

  it("is accessible without authentication (public procedure)", async () => {
    // Should not throw UNAUTHORIZED
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.games.getTrendingNow({ type: "gainers", limit: 5, minCcu: 0 })
    ).resolves.toBeDefined();
  });
});

// ─── Game News ────────────────────────────────────────────────────────────────

describe("games.getGameNews", () => {
  it("returns an array of news items for a known game", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getGameNews({ appid: 730, count: 5 });
    expect(Array.isArray(result)).toBe(true);
  }, 15000);

  it("news items have required shape when data exists", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getGameNews({ appid: 730, count: 3 });
    if (result.length > 0) {
      const item = result[0]!;
      expect(item).toHaveProperty("gid");
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("url");
      expect(item).toHaveProperty("date");
      expect(typeof item.title).toBe("string");
      expect(typeof item.url).toBe("string");
    }
  }, 15000);

  it("respects the count parameter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getGameNews({ appid: 730, count: 3 });
    expect(result.length).toBeLessThanOrEqual(3);
  }, 15000);
});

// ─── Full Metadata ────────────────────────────────────────────────────────────

describe("games.getFullMetadata", () => {
  it("returns metadata object or null for a known game", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getFullMetadata({ appid: 730 });
    // May return null if Steam API is temporarily unavailable
    if (result !== null) {
      expect(result).toHaveProperty("appid");
      expect(result).toHaveProperty("name");
      expect(result.appid).toBe(730);
    }
  }, 20000);

  it("returns null for an invalid appid", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getFullMetadata({ appid: 999999999 });
    expect(result).toBeNull();
  }, 20000);

  it("metadata has system requirements fields when available", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getFullMetadata({ appid: 730 });
    if (result !== null) {
      // These fields should exist (may be empty objects/null)
      expect("pcRequirements" in result).toBe(true);
      expect("categories" in result).toBe(true);
      expect("genres" in result).toBe(true);
    }
  }, 20000);
});

// ─── Reviews V2 ───────────────────────────────────────────────────────────────

describe("games.getReviewsV2", () => {
  it("returns reviews and summary for a known game", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getReviewsV2({ appid: 730, filter: "all", numPerPage: 5, cursor: "*" });
    expect(result).toHaveProperty("reviews");
    expect(Array.isArray(result.reviews)).toBe(true);
  }, 15000);

  it("returns review summary with positive/negative counts", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getReviewsV2({ appid: 730, filter: "all", numPerPage: 3, cursor: "*" });
    if (result.summary) {
      expect(result.summary).toHaveProperty("totalPositive");
      expect(result.summary).toHaveProperty("totalNegative");
      expect(result.summary).toHaveProperty("totalReviews");
      expect(typeof result.summary.totalPositive).toBe("number");
      expect(typeof result.summary.totalNegative).toBe("number");
    }
  }, 15000);

  it("accepts recent filter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getReviewsV2({ appid: 730, filter: "recent", numPerPage: 3, cursor: "*" });
    expect(Array.isArray(result.reviews)).toBe(true);
  }, 15000);

  it("accepts negative filter", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.games.getReviewsV2({ appid: 730, filter: "negative", numPerPage: 3, cursor: "*" });
    expect(Array.isArray(result.reviews)).toBe(true);
  }, 15000);
});
