/**
 * Steam Web API Service
 * Fetches live player counts and game data from Steam's official API
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
  platforms: { windows: boolean; mac: boolean; linux: boolean };
  tags: string[];
  screenshots: string[];
  background: string;
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
 * Get detailed app info from Steam Store API
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
    const reviewData = d as Record<string, unknown>;
    const metacritic = d.metacritic as Record<string, unknown> | undefined;
    const platforms = d.platforms as Record<string, boolean> | undefined;

    return {
      appid,
      name: String(d.name ?? ""),
      shortDescription: String(d.short_description ?? ""),
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
      reviewScore: Number(reviewData.review_score ?? 0),
      reviewScoreDesc: String(reviewData.review_score_desc ?? ""),
      totalReviews: Number(reviewData.total_reviews ?? 0),
      positiveReviews: Number(reviewData.total_positive ?? 0),
      negativeReviews: Number(reviewData.total_negative ?? 0),
      website: d.website ? String(d.website) : null,
      metacriticScore: metacritic ? Number(metacritic.score) : null,
      platforms: {
        windows: Boolean(platforms?.windows),
        mac: Boolean(platforms?.mac),
        linux: Boolean(platforms?.linux),
      },
      tags: [],
      screenshots: Array.isArray(d.screenshots)
        ? (d.screenshots as Record<string, string>[]).slice(0, 6).map((s) => s.path_full)
        : [],
      background: String(d.background ?? ""),
    };
  } catch {
    return null;
  }
}

/**
 * Batch fetch current players for multiple apps
 */
export async function getBatchCurrentPlayers(appids: number[]): Promise<Map<number, number>> {
  const results = new Map<number, number>();
  // Fetch in parallel batches of 10
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
