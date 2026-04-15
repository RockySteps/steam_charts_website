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
 * Refreshed every 24 hours to respect API rate limits
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
  scoreRank: varchar("score_rank", { length: 32 }),
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
