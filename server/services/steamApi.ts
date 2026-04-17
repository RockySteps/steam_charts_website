/**
 * Steam Web API Service
 * Fetches live player counts, game data, news, system requirements, and metadata
 * All endpoints use publicly available Steam APIs — no API key required for most.
 */

const STEAM_API_BASE = "https://api.steampowered.com";
const STEAM_STORE_API = "https://store.steampowered.com/api";

export interface SteamPlayerCount {
  appid: number;
  playerCount: number;
}

export interface SteamAppDetail {
  appid: number;
  name: string;
  shortDescription: string;
  detailedDescription: string;
  headerImage: string;
  capsuleImage: string;
  developers: string[];
  publishers: string[];
  genres: { id: string; description: string }[];
  categories: { id: number; description: string }[];
  releaseDate: string;
  isFree: boolean;
  priceUsd: number | null;
  originalPriceUsd: number | null;
  discountPercent: number;
  reviewScore: number;
  reviewScoreDesc: string;
  totalReviews: number;
  positiveReviews: number;
  negativeReviews: number;
  website: string | null;
  metacriticScore: number | null;
  metacriticUrl: string | null;
  platforms: { windows: boolean; mac: boolean; linux: boolean };
  tags: string[];
  screenshots: string[];
  background: string;
  // System requirements
  pcRequirements: { minimum: string; recommended: string } | null;
  macRequirements: { minimum: string; recommended: string } | null;
  linuxRequirements: { minimum: string; recommended: string } | null;
  // Extra metadata
  supportedLanguages: string;
  contentDescriptors: string[];
  achievementsTotal: number;
  dlcCount: number;
  ageRating: string;
  legalNotice: string | null;
  supportEmail: string | null;
  supportUrl: string | null;
}

export interface SteamNewsItem {
  gid: string;
  title: string;
  url: string;
  isExternalUrl: boolean;
  author: string;
  contents: string;
  feedLabel: string;
  date: number; // unix timestamp
  feedName: string;
  tags: string[];
}

export interface SteamReviewSummary {
  totalReviews: number;
  positiveReviews: number;
  negativeReviews: number;
  positivePercent: number;
  reviewScoreDesc: string;
  reviewScore: number;
}

export interface SteamReview {
  recommendationid: string;
  author: {
    steamid: string;
    playtimeForever: number;
    playtimeAtReview: number;
    numGamesOwned: number;
    numReviews: number;
  };
  language: string;
  review: string;
  timestampCreated: number;
  timestampUpdated: number;
  votedUp: boolean;
  votesUp: number;
  votesDown: number;
  steamPurchase: boolean;
  receivedForFree: boolean;
  writtenDuringEarlyAccess: boolean;
}

/**
 * Get current player count for a specific game
 */
export async function getCurrentPlayers(appid: number): Promise<number> {
  try {
    const url = `${STEAM_API_BASE}/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appid}&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return 0;
    const data = await res.json() as { response?: { player_count?: number; result?: number } };
    if (data?.response?.result === 1) {
      return data.response.player_count ?? 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Get detailed app info from Steam Store API (includes system requirements, metadata)
 */
export async function getAppDetails(appid: number): Promise<SteamAppDetail | null> {
  try {
    const url = `${STEAM_STORE_API}/appdetails?appids=${appid}&cc=us&l=en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, { success: boolean; data: Record<string, unknown> }>;
    const appData = data[String(appid)];
    if (!appData?.success || !appData.data) return null;
    const d = appData.data;

    const priceOverview = d.price_overview as Record<string, unknown> | undefined;
    const releaseDate = d.release_date as Record<string, string> | undefined;
    const metacritic = d.metacritic as Record<string, unknown> | undefined;
    const platforms = d.platforms as Record<string, boolean> | undefined;
    const achievements = d.achievements as Record<string, unknown> | undefined;
    const support = d.support_info as Record<string, string> | undefined;
    const contentDesc = d.content_descriptors as Record<string, unknown> | undefined;

    // Parse system requirements
    const parseReqs = (raw: unknown): { minimum: string; recommended: string } | null => {
      if (!raw || typeof raw !== "object") return null;
      const r = raw as Record<string, string>;
      if (!r.minimum && !r.recommended) return null;
      return {
        minimum: r.minimum ?? "",
        recommended: r.recommended ?? "",
      };
    };

    // Parse content descriptors
    const descriptors: string[] = [];
    if (contentDesc?.notes && typeof contentDesc.notes === "string") {
      descriptors.push(contentDesc.notes);
    }

    return {
      appid,
      name: String(d.name ?? ""),
      shortDescription: String(d.short_description ?? ""),
      detailedDescription: String(d.detailed_description ?? ""),
      headerImage: String(d.header_image ?? ""),
      capsuleImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_231x87.jpg`,
      developers: Array.isArray(d.developers) ? d.developers as string[] : [],
      publishers: Array.isArray(d.publishers) ? d.publishers as string[] : [],
      genres: Array.isArray(d.genres)
        ? (d.genres as Record<string, string>[]).map((g) => ({ id: g.id, description: g.description }))
        : [],
      categories: Array.isArray(d.categories)
        ? (d.categories as Record<string, unknown>[]).map((c) => ({ id: Number(c.id), description: String(c.description) }))
        : [],
      releaseDate: releaseDate?.date ?? "",
      isFree: Boolean(d.is_free),
      priceUsd: priceOverview ? Number(priceOverview.final) / 100 : null,
      originalPriceUsd: priceOverview ? Number(priceOverview.initial) / 100 : null,
      discountPercent: priceOverview ? Number(priceOverview.discount_percent) : 0,
      reviewScore: Number((d as Record<string, unknown>).review_score ?? 0),
      reviewScoreDesc: String((d as Record<string, unknown>).review_score_desc ?? ""),
      totalReviews: Number((d as Record<string, unknown>).total_reviews ?? 0),
      positiveReviews: Number((d as Record<string, unknown>).total_positive ?? 0),
      negativeReviews: Number((d as Record<string, unknown>).total_negative ?? 0),
      website: d.website ? String(d.website) : null,
      metacriticScore: metacritic ? Number(metacritic.score) : null,
      metacriticUrl: metacritic ? String(metacritic.url ?? "") : null,
      platforms: {
        windows: Boolean(platforms?.windows),
        mac: Boolean(platforms?.mac),
        linux: Boolean(platforms?.linux),
      },
      tags: [],
      screenshots: Array.isArray(d.screenshots)
        ? (d.screenshots as Record<string, string>[]).slice(0, 8).map((s) => s.path_full)
        : [],
      background: String(d.background ?? ""),
      // System requirements
      pcRequirements: parseReqs(d.pc_requirements),
      macRequirements: parseReqs(d.mac_requirements),
      linuxRequirements: parseReqs(d.linux_requirements),
      // Extra metadata
      supportedLanguages: String(d.supported_languages ?? ""),
      contentDescriptors: descriptors,
      achievementsTotal: achievements ? Number((achievements as Record<string, unknown>).total ?? 0) : 0,
      dlcCount: Array.isArray(d.dlc) ? (d.dlc as unknown[]).length : 0,
      ageRating: String(d.required_age ?? "0"),
      legalNotice: d.legal_notice ? String(d.legal_notice) : null,
      supportEmail: support?.email ?? null,
      supportUrl: support?.url ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Get recent news for a game via Steam News API (ISteamNews/GetNewsForApp)
 * Publicly available, no API key required
 */
export async function getGameNews(appid: number, count = 10): Promise<SteamNewsItem[]> {
  try {
    const url = `${STEAM_API_BASE}/ISteamNews/GetNewsForApp/v2/?appid=${appid}&count=${count}&maxlength=500&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json() as {
      appnews?: {
        newsitems?: Array<{
          gid: string;
          title: string;
          url: string;
          is_external_url: boolean;
          author: string;
          contents: string;
          feedlabel: string;
          date: number;
          feedname: string;
          tags?: string[];
        }>;
      };
    };
    const items = data?.appnews?.newsitems ?? [];
    return items.map((item) => ({
      gid: item.gid,
      title: item.title,
      url: item.url,
      isExternalUrl: item.is_external_url,
      author: item.author,
      contents: item.contents,
      feedLabel: item.feedlabel,
      date: item.date,
      feedName: item.feedname,
      tags: item.tags ?? [],
    }));
  } catch {
    return [];
  }
}

/**
 * Get user reviews for a game via Steam Store Reviews API
 * Publicly available, no API key required
 */
export async function getGameReviews(
  appid: number,
  filter: "all" | "recent" | "positive" | "negative" = "all",
  numPerPage = 10,
  cursor = "*"
): Promise<{ reviews: SteamReview[]; querySummary: SteamReviewSummary; cursor: string }> {
  try {
    const params = new URLSearchParams({
      json: "1",
      filter,
      language: "english",
      day_range: "365",
      cursor,
      review_type: "all",
      purchase_type: "all",
      num_per_page: String(numPerPage),
    });
    const url = `https://store.steampowered.com/appreviews/${appid}?${params}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { reviews: [], querySummary: emptyReviewSummary(), cursor: "*" };
    const data = await res.json() as {
      success: number;
      cursor?: string;
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
        author: {
          steamid: string;
          playtime_forever: number;
          playtime_at_review: number;
          num_games_owned: number;
          num_reviews: number;
        };
        language: string;
        review: string;
        timestamp_created: number;
        timestamp_updated: number;
        voted_up: boolean;
        votes_up: number;
        votes_funny: number;
        steam_purchase: boolean;
        received_for_free: boolean;
        written_during_early_access: boolean;
      }>;
    };

    const qs = data.query_summary;
    const total = qs?.total_reviews ?? 0;
    const positive = qs?.total_positive ?? 0;
    const negative = qs?.total_negative ?? 0;

    const summary: SteamReviewSummary = {
      totalReviews: total,
      positiveReviews: positive,
      negativeReviews: negative,
      positivePercent: total > 0 ? Math.round((positive / total) * 100) : 0,
      reviewScoreDesc: qs?.review_score_desc ?? "",
      reviewScore: qs?.review_score ?? 0,
    };

    const reviews: SteamReview[] = (data.reviews ?? []).map((r) => ({
      recommendationid: r.recommendationid,
      author: {
        steamid: r.author.steamid,
        playtimeForever: r.author.playtime_forever,
        playtimeAtReview: r.author.playtime_at_review,
        numGamesOwned: r.author.num_games_owned,
        numReviews: r.author.num_reviews,
      },
      language: r.language,
      review: r.review,
      timestampCreated: r.timestamp_created,
      timestampUpdated: r.timestamp_updated,
      votedUp: r.voted_up,
      votesUp: r.votes_up,
      votesDown: r.votes_funny,
      steamPurchase: r.steam_purchase,
      receivedForFree: r.received_for_free,
      writtenDuringEarlyAccess: r.written_during_early_access,
    }));

    return { reviews, querySummary: summary, cursor: data.cursor ?? "*" };
  } catch {
    return { reviews: [], querySummary: emptyReviewSummary(), cursor: "*" };
  }
}

function emptyReviewSummary(): SteamReviewSummary {
  return { totalReviews: 0, positiveReviews: 0, negativeReviews: 0, positivePercent: 0, reviewScoreDesc: "", reviewScore: 0 };
}

/**
 * Batch fetch current players for multiple apps
 */
export async function getBatchCurrentPlayers(appids: number[]): Promise<Map<number, number>> {
  const results = new Map<number, number>();
  const batchSize = 10;
  for (let i = 0; i < appids.length; i += batchSize) {
    const batch = appids.slice(i, i + batchSize);
    const promises = batch.map(async (appid) => {
      const count = await getCurrentPlayers(appid);
      results.set(appid, count);
    });
    await Promise.all(promises);
  }
  return results;
}
