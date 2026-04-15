import { bigint, float, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Cache for game metadata fetched from Steam/SteamSpy APIs
 */
export const gameCache = mysqlTable("game_cache", {
  id: int("id").autoincrement().primaryKey(),
  appid: int("appid").notNull().unique(),
  name: varchar("name", { length: 512 }).notNull(),
  developer: text("developer"),
  publisher: text("publisher"),
  genre: text("genre"),
  tags: json("tags"),
  headerImage: text("header_image"),
  capsuleImage: text("capsule_image"),
  priceUsd: float("price_usd"),
  originalPriceUsd: float("original_price_usd"),
  discountPercent: int("discount_percent").default(0),
  isFree: int("is_free").default(0),
  releaseDate: varchar("release_date", { length: 64 }),
  reviewScore: int("review_score").default(0),
  reviewScoreDesc: varchar("review_score_desc", { length: 128 }),
  totalReviews: int("total_reviews").default(0),
  positiveReviews: int("positive_reviews").default(0),
  negativeReviews: int("negative_reviews").default(0),
  metacriticScore: int("metacritic_score"),
  shortDescription: text("short_description"),
  website: text("website"),
  platforms: json("platforms"),
  screenshots: json("screenshots"),
  background: text("background"),
  currentPlayers: int("current_players").default(0),
  peakPlayers: int("peak_players").default(0),
  peakPlayersAllTime: int("peak_players_all_time").default(0),
  averagePlaytimeForever: int("average_playtime_forever").default(0),
  averagePlaytime2weeks: int("average_playtime_2weeks").default(0),
  ownersMin: bigint("owners_min", { mode: "number" }).default(0),
  ownersMax: bigint("owners_max", { mode: "number" }).default(0),
  ccu: int("ccu").default(0),
  prevCcu: int("prev_ccu").default(0),          // previous snapshot for gain/loss calculation
  ccuUpdatedAt: timestamp("ccu_updated_at"),    // when ccu was last updated
  scoreRank: varchar("score_rank", { length: 32 }),
  // Steam review details from official API
  reviewSummary: varchar("review_summary", { length: 256 }),
  reviewType: varchar("review_type", { length: 64 }),
  lastUpdated: timestamp("last_updated").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GameCache = typeof gameCache.$inferSelect;
export type InsertGameCache = typeof gameCache.$inferInsert;

/**
 * Historical player count snapshots
 */
export const playerHistory = mysqlTable("player_history", {
  id: int("id").autoincrement().primaryKey(),
  appid: int("appid").notNull(),
  players: int("players").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

export type PlayerHistory = typeof playerHistory.$inferSelect;
export type InsertPlayerHistory = typeof playerHistory.$inferInsert;

/**
 * Monthly aggregated player statistics per game
 * Stores avg players, gain, % gain, peak players per calendar month
 */
export const monthlyStats = mysqlTable("monthly_stats", {
  id: int("id").autoincrement().primaryKey(),
  appid: int("appid").notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(), // 1-12
  avgPlayers: float("avg_players").default(0),
  peakPlayers: int("peak_players").default(0),
  minPlayers: int("min_players").default(0),
  gain: float("gain").default(0),          // absolute gain vs previous month
  gainPercent: float("gain_percent").default(0), // % gain vs previous month
  dataPoints: int("data_points").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type MonthlyStats = typeof monthlyStats.$inferSelect;
export type InsertMonthlyStats = typeof monthlyStats.$inferInsert;

/**
 * Crawl queue for 13K games — tracks which games need to be fetched/refreshed
 */
export const crawlQueue = mysqlTable("crawl_queue", {
  id: int("id").autoincrement().primaryKey(),
  appid: int("appid").notNull().unique(),
  priority: int("priority").default(2).notNull(), // 1=high (top CCU), 2=normal
  status: mysqlEnum("status", ["pending", "processing", "done", "failed"]).default("pending").notNull(),
  retryCount: int("retry_count").default(0).notNull(),
  lastCrawledAt: timestamp("last_crawled_at"),
  nextCrawlAt: timestamp("next_crawl_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CrawlQueue = typeof crawlQueue.$inferSelect;
export type InsertCrawlQueue = typeof crawlQueue.$inferInsert;

/**
 * Crawl job logs — records each crawl run's summary
 */
export const crawlLog = mysqlTable("crawl_log", {
  id: int("id").autoincrement().primaryKey(),
  jobId: varchar("job_id", { length: 64 }).notNull().unique(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  totalGames: int("total_games").default(0),
  successCount: int("success_count").default(0),
  failedCount: int("failed_count").default(0),
  skippedCount: int("skipped_count").default(0),
  status: mysqlEnum("status", ["running", "completed", "stopped", "failed"]).default("running").notNull(),
  triggerType: mysqlEnum("trigger_type", ["startup", "scheduled", "manual", "admin"]).default("manual").notNull(),
  notes: text("notes"),
});

export type CrawlLog = typeof crawlLog.$inferSelect;
export type InsertCrawlLog = typeof crawlLog.$inferInsert;
