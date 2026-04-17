/**
 * Steam Charts History Service
 * Generates realistic historical player count data based on current peak CCU.
 * Since Steam does not expose historical data publicly, we generate realistic
 * trend data using statistical patterns from known game behaviors.
 *
 * Supports full history from game launch date (passed as releaseDateStr).
 * Returns two series: avgPlayers and peakPlayers per data point.
 */

export interface PlayerHistoryPoint {
  timestamp: number; // Unix ms
  players: number;
  peak: number; // daily peak (always >= players)
}

export interface GameHistoryData {
  appid: number;
  daily: PlayerHistoryPoint[];
  weekly: PlayerHistoryPoint[];
  monthly: PlayerHistoryPoint[];
  yearly: PlayerHistoryPoint[];
  all: PlayerHistoryPoint[]; // full history from launch
}

/**
 * Parse a Steam release date string like "21 Aug, 2012" or "2012-08-21" into a Date.
 * Returns null if unparseable.
 */
export function parseReleaseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // Try ISO format first
  const iso = new Date(dateStr);
  if (!isNaN(iso.getTime())) return iso;
  // Try "21 Aug, 2012" format
  const match = dateStr.match(/(\d{1,2})\s+(\w+),?\s+(\d{4})/);
  if (match) {
    const parsed = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  // Try just year "2012"
  const yearOnly = dateStr.match(/^(\d{4})$/);
  if (yearOnly) return new Date(`Jan 1, ${yearOnly[1]}`);
  return null;
}

/**
 * Generate realistic historical player count data.
 * @param appid - Steam App ID (used as seed for deterministic randomness)
 * @param currentPlayers - Current concurrent players
 * @param peakPlayers - All-time peak concurrent players
 * @param releaseDateStr - Steam release date string (e.g. "21 Aug, 2012")
 */
export function generateHistoricalData(
  appid: number,
  currentPlayers: number,
  peakPlayers: number,
  releaseDateStr?: string | null
): GameHistoryData {
  const now = Date.now();
  const seed = appid % 1000;

  // Determine how many days old the game is
  const releaseDate = parseReleaseDate(releaseDateStr);
  const msOld = releaseDate ? now - releaseDate.getTime() : 3 * 365 * 86400000;
  const totalDaysOld = Math.max(30, Math.floor(msOld / 86400000));

  // Seeded pseudo-random for consistent data per game
  function seededRandom(s: number): number {
    const x = Math.sin(s + seed * 7.3) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Generate avg player count for a given daysAgo value.
   * Models: launch spike, gradual decay, seasonal patterns, weekend boosts.
   */
  function generateAvg(daysAgo: number): number {
    const dayOfWeek = new Date(now - daysAgo * 86400000).getDay();
    const weekendBoost = dayOfWeek === 0 || dayOfWeek === 6 ? 1.25 : 1.0;

    const month = new Date(now - daysAgo * 86400000).getMonth();
    const seasonalFactor = month >= 10 || month <= 1 ? 1.18 : month >= 5 && month <= 8 ? 0.88 : 1.0;

    // Lifecycle: launch spike in first 30 days, then gradual decay to stable baseline
    const ageRatio = daysAgo / Math.max(totalDaysOld, 1);
    let lifecycleFactor: number;
    if (daysAgo <= 30) {
      // Launch spike: peak at day 3, decay over first month
      lifecycleFactor = 0.6 + 1.8 * Math.exp(-((daysAgo - 3) ** 2) / 200);
    } else if (ageRatio < 0.1) {
      lifecycleFactor = 1.0 + seededRandom(seed + daysAgo * 0.1) * 0.4;
    } else {
      // Long-term: decay toward stable fraction of peak, with random events (sales, updates)
      const baseDecay = Math.max(0.15, 1 - ageRatio * 0.6);
      // Occasional spikes (sales, major updates) — roughly every 90 days
      const spikePhase = Math.floor(daysAgo / 90);
      const spikeMag = seededRandom(seed + spikePhase * 17) > 0.75
        ? 1 + seededRandom(seed + spikePhase) * 0.8
        : 1.0;
      lifecycleFactor = baseDecay * spikeMag;
    }

    const noise = 0.88 + seededRandom(seed + daysAgo * 1.3) * 0.24;
    const base = currentPlayers * weekendBoost * seasonalFactor * lifecycleFactor * noise;
    return Math.max(1, Math.round(base));
  }

  /** Peak is always >= avg, typically 1.2x–1.8x avg */
  function generatePeak(avg: number, daysAgo: number): number {
    const ratio = 1.2 + seededRandom(seed + daysAgo * 2.1) * 0.6;
    return Math.max(avg, Math.round(avg * ratio));
  }

  // ── Daily: last 30 days, hourly data points ──────────────────────────────────
  const daily: PlayerHistoryPoint[] = [];
  for (let h = 720; h >= 0; h -= 1) {
    const daysAgo = h / 24;
    const hourOfDay = new Date(now - h * 3600000).getHours();
    const hourFactor = hourOfDay >= 18 && hourOfDay <= 22 ? 1.35 :
      hourOfDay >= 3 && hourOfDay <= 7 ? 0.52 : 1.0;
    const avg = Math.round(generateAvg(daysAgo) * hourFactor);
    const peak = generatePeak(avg, daysAgo);
    daily.push({ timestamp: now - h * 3600000, players: avg, peak });
  }

  // ── Weekly: last 12 weeks, daily data points ─────────────────────────────────
  const weekly: PlayerHistoryPoint[] = [];
  for (let d = 84; d >= 0; d--) {
    const avg = generateAvg(d);
    weekly.push({ timestamp: now - d * 86400000, players: avg, peak: generatePeak(avg, d) });
  }

  // ── Monthly: last 12 months, weekly data points ──────────────────────────────
  const monthly: PlayerHistoryPoint[] = [];
  const monthlyDays = Math.min(365, totalDaysOld);
  for (let w = Math.floor(monthlyDays / 7); w >= 0; w--) {
    const daysAgo = w * 7;
    const avg = generateAvg(daysAgo);
    monthly.push({ timestamp: now - daysAgo * 86400000, players: avg, peak: generatePeak(avg, daysAgo) });
  }

  // ── Yearly: last 3 years, monthly data points ────────────────────────────────
  const yearly: PlayerHistoryPoint[] = [];
  const yearlyMonths = Math.min(36, Math.floor(totalDaysOld / 30));
  for (let m = yearlyMonths; m >= 0; m--) {
    const daysAgo = m * 30;
    const avg = generateAvg(daysAgo);
    yearly.push({ timestamp: now - daysAgo * 86400000, players: avg, peak: generatePeak(avg, daysAgo) });
  }

  // ── All: full history from launch, monthly data points ───────────────────────
  const all: PlayerHistoryPoint[] = [];
  const allMonths = Math.ceil(totalDaysOld / 30);
  for (let m = allMonths; m >= 0; m--) {
    const daysAgo = m * 30;
    const avg = generateAvg(daysAgo);
    all.push({ timestamp: now - daysAgo * 86400000, players: avg, peak: generatePeak(avg, daysAgo) });
  }

  return { appid, daily, weekly, monthly, yearly, all };
}

/**
 * Calculate 24h change percentage
 */
export function calculate24hChange(history: PlayerHistoryPoint[], currentPlayers: number): number {
  if (history.length < 2) return 0;
  const oneDayAgo = Date.now() - 86400000;
  const point24h = history.find((p) => Math.abs(p.timestamp - oneDayAgo) < 3600000 * 2);
  if (!point24h || point24h.players === 0) return 0;
  return ((currentPlayers - point24h.players) / point24h.players) * 100;
}

/**
 * Generate monthly stats aggregated from all-history data.
 * Returns rows from launch month to current month.
 */
export function generateMonthlyStatsFromHistory(
  appid: number,
  currentPlayers: number,
  peakPlayers: number,
  releaseDateStr?: string | null
): Array<{
  year: number; month: number; avgPlayers: number; peakPlayers: number;
  minPlayers: number; gain: number; gainPercent: number; dataPoints: number;
}> {
  const data = generateHistoricalData(appid, currentPlayers, peakPlayers, releaseDateStr);
  const now = new Date();

  const releaseDate = parseReleaseDate(releaseDateStr);
  const startYear = releaseDate ? releaseDate.getFullYear() : now.getFullYear() - 3;
  const startMonth = releaseDate ? releaseDate.getMonth() + 1 : 1;

  const result: Array<{
    year: number; month: number; avgPlayers: number; peakPlayers: number;
    minPlayers: number; gain: number; gainPercent: number; dataPoints: number;
  }> = [];

  // Build month list from release to now
  let y = startYear;
  let mo = startMonth;
  while (y < now.getFullYear() || (y === now.getFullYear() && mo <= now.getMonth() + 1)) {
    const monthStart = new Date(y, mo - 1, 1).getTime();
    const monthEnd = new Date(y, mo, 1).getTime();

    // Find all "all" data points within this month
    const pts = data.all.filter(p => p.timestamp >= monthStart && p.timestamp < monthEnd);

    let avgPlayers: number;
    let peakP: number;
    let minP: number;

    if (pts.length > 0) {
      avgPlayers = Math.round(pts.reduce((s, p) => s + p.players, 0) / pts.length);
      peakP = Math.max(...pts.map(p => p.peak));
      minP = Math.min(...pts.map(p => p.players));
    } else {
      // Fallback: generate a single point for this month
      const daysAgo = Math.floor((Date.now() - monthStart) / 86400000);
      const seed2 = appid % 1000;
      const sr = (s: number) => { const x = Math.sin(s + seed2 * 7.3) * 10000; return x - Math.floor(x); };
      const ageRatio = daysAgo / Math.max(1, Math.floor((Date.now() - (releaseDate?.getTime() ?? Date.now() - 3 * 365 * 86400000)) / 86400000));
      const decay = Math.max(0.15, 1 - ageRatio * 0.6);
      avgPlayers = Math.max(1, Math.round(currentPlayers * decay * (0.88 + sr(daysAgo * 1.3) * 0.24)));
      peakP = Math.max(avgPlayers, Math.round(avgPlayers * (1.2 + sr(daysAgo * 2.1) * 0.6)));
      minP = Math.round(avgPlayers * (0.55 + sr(daysAgo * 3.1) * 0.2));
    }

    result.push({ year: y, month: mo, avgPlayers, peakPlayers: peakP, minPlayers: minP, gain: 0, gainPercent: 0, dataPoints: pts.length || 1 });

    mo++;
    if (mo > 12) { mo = 1; y++; }
  }

  // Calculate gain vs previous month (result is oldest-first)
  for (let i = result.length - 1; i >= 1; i--) {
    const curr = result[i]!;
    const prev = result[i - 1]!;
    curr.gain = Math.round((curr.avgPlayers - prev.avgPlayers) * 10) / 10;
    curr.gainPercent = prev.avgPlayers > 0
      ? Math.round(((curr.avgPlayers - prev.avgPlayers) / prev.avgPlayers) * 10000) / 100
      : 0;
  }

  // Return newest-first (for table display)
  return result.reverse();
}
