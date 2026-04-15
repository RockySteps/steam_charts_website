/**
 * SteamSpy API Service
 * Fetches game statistics including top charts, ownership data, playtime, and genre data
 */

const STEAMSPY_API = "https://steamspy.com/api.php";

export interface SteamSpyGame {
  appid: number;
  name: string;
  developer: string;
  publisher: string;
  scoreRank: string;
  owners: string;
  ownersMin: number;
  ownersMax: number;
  averageForever: number;
  average2weeks: number;
  medianForever: number;
  median2weeks: number;
  ccu: number; // peak CCU yesterday
  price: number; // cents
  initialPrice: number; // cents
  discount: number;
  tags: Record<string, number>;
  languages: string;
  genre: string;
}

function parseOwners(owners: string): { min: number; max: number } {
  if (!owners) return { min: 0, max: 0 };
  const parts = owners.replace(/,/g, "").split(" .. ");
  return {
    min: parseInt(parts[0] ?? "0", 10) || 0,
    max: parseInt(parts[1] ?? "0", 10) || 0,
  };
}

function mapGame(raw: Record<string, unknown>): SteamSpyGame {
  const owners = String(raw.owners ?? "");
  const { min, max } = parseOwners(owners);
  return {
    appid: Number(raw.appid),
    name: String(raw.name ?? ""),
    developer: String(raw.developer ?? ""),
    publisher: String(raw.publisher ?? ""),
    scoreRank: String(raw.score_rank ?? ""),
    owners,
    ownersMin: min,
    ownersMax: max,
    averageForever: Number(raw.average_forever ?? 0),
    average2weeks: Number(raw.average_2weeks ?? 0),
    medianForever: Number(raw.median_forever ?? 0),
    median2weeks: Number(raw.median_2weeks ?? 0),
    ccu: Number(raw.ccu ?? 0),
    price: Number(raw.price ?? 0),
    initialPrice: Number(raw.initialprice ?? 0),
    discount: Number(raw.discount ?? 0),
    tags: (raw.tags as Record<string, number>) ?? {},
    languages: String(raw.languages ?? ""),
    genre: String(raw.genre ?? ""),
  };
}

async function fetchSteamSpy(params: Record<string, string>): Promise<unknown> {
  const url = new URL(STEAMSPY_API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`SteamSpy API error: ${res.status}`);
  return res.json();
}

/**
 * Get top 100 games by players in the last 2 weeks
 */
export async function getTop100In2Weeks(): Promise<SteamSpyGame[]> {
  try {
    const data = await fetchSteamSpy({ request: "top100in2weeks" }) as Record<string, Record<string, unknown>>;
    return Object.values(data).map(mapGame).sort((a, b) => b.ccu - a.ccu);
  } catch (e) {
    console.error("[SteamSpy] getTop100In2Weeks error:", e);
    return [];
  }
}

/**
 * Get top 100 games by players since March 2009 (all-time)
 */
export async function getTop100Forever(): Promise<SteamSpyGame[]> {
  try {
    const data = await fetchSteamSpy({ request: "top100forever" }) as Record<string, Record<string, unknown>>;
    return Object.values(data).map(mapGame).sort((a, b) => b.ccu - a.ccu);
  } catch (e) {
    console.error("[SteamSpy] getTop100Forever error:", e);
    return [];
  }
}

/**
 * Get top 100 games by owners
 */
export async function getTop100Owned(): Promise<SteamSpyGame[]> {
  try {
    const data = await fetchSteamSpy({ request: "top100owned" }) as Record<string, Record<string, unknown>>;
    return Object.values(data).map(mapGame).sort((a, b) => b.ownersMax - a.ownersMax);
  } catch (e) {
    console.error("[SteamSpy] getTop100Owned error:", e);
    return [];
  }
}

/**
 * Get details for a specific app
 */
export async function getAppDetails(appid: number): Promise<SteamSpyGame | null> {
  try {
    const data = await fetchSteamSpy({ request: "appdetails", appid: String(appid) }) as Record<string, unknown>;
    return mapGame(data);
  } catch (e) {
    console.error("[SteamSpy] getAppDetails error:", e);
    return null;
  }
}

/**
 * Get games by genre
 */
export async function getGamesByGenre(genre: string): Promise<SteamSpyGame[]> {
  try {
    const data = await fetchSteamSpy({ request: "genre", genre }) as Record<string, Record<string, unknown>>;
    return Object.values(data).map(mapGame).sort((a, b) => b.ccu - a.ccu);
  } catch (e) {
    console.error("[SteamSpy] getGamesByGenre error:", e);
    return [];
  }
}

/**
 * Get games by tag
 */
export async function getGamesByTag(tag: string): Promise<SteamSpyGame[]> {
  try {
    const data = await fetchSteamSpy({ request: "tag", tag }) as Record<string, Record<string, unknown>>;
    return Object.values(data).map(mapGame).sort((a, b) => b.ccu - a.ccu);
  } catch (e) {
    console.error("[SteamSpy] getGamesByTag error:", e);
    return [];
  }
}
