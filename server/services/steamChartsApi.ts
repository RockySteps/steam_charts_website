/**
 * Steam Charts History Service
 * Generates realistic historical player count data based on current peak CCU
 * Since Steam doesn't expose historical data publicly, we generate realistic
 * trend data using statistical patterns from known game behaviors.
 */

export interface PlayerHistoryPoint {
  timestamp: number; // Unix ms
  players: number;
}

export interface GameHistoryData {
  appid: number;
  daily: PlayerHistoryPoint[];
  weekly: PlayerHistoryPoint[];
  monthly: PlayerHistoryPoint[];
  yearly: PlayerHistoryPoint[];
}

/**
 * Generate realistic historical player count data
 * Uses a combination of seasonal patterns, weekly cycles, and random noise
 */
export function generateHistoricalData(
  appid: number,
  currentPlayers: number,
  peakPlayers: number,
  daysOld: number = 365
): GameHistoryData {
  const now = Date.now();
  const seed = appid % 1000;

  // Seeded pseudo-random for consistent data per game
  function seededRandom(s: number): number {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  }

  function generatePoint(daysAgo: number, basePlayers: number): number {
    const dayOfWeek = ((new Date(now - daysAgo * 86400000).getDay()) + 7) % 7;
    const weekendBoost = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1.0;

    // Seasonal pattern (higher in winter months)
    const month = new Date(now - daysAgo * 86400000).getMonth();
    const seasonalFactor = month >= 10 || month <= 1 ? 1.2 : month >= 5 && month <= 8 ? 0.85 : 1.0;

    // Game lifecycle curve (newer games have higher relative activity)
    const ageFactor = Math.max(0.3, 1 - (daysAgo / (daysOld * 2)) * 0.5);

    // Noise
    const noise = 0.85 + seededRandom(seed + daysAgo) * 0.3;

    return Math.round(basePlayers * weekendBoost * seasonalFactor * ageFactor * noise);
  }

  // Daily: last 30 days, hourly data points
  const daily: PlayerHistoryPoint[] = [];
  for (let h = 720; h >= 0; h -= 1) {
    const hoursAgo = h;
    const daysAgo = hoursAgo / 24;
    const hourOfDay = new Date(now - hoursAgo * 3600000).getHours();
    // Peak hours 18-22, low 3-7
    const hourFactor = hourOfDay >= 18 && hourOfDay <= 22 ? 1.4 :
      hourOfDay >= 3 && hourOfDay <= 7 ? 0.5 : 1.0;
    const base = generatePoint(daysAgo, currentPlayers);
    daily.push({ timestamp: now - hoursAgo * 3600000, players: Math.round(base * hourFactor) });
  }

  // Weekly: last 12 weeks, daily data points
  const weekly: PlayerHistoryPoint[] = [];
  for (let d = 84; d >= 0; d--) {
    weekly.push({ timestamp: now - d * 86400000, players: generatePoint(d, currentPlayers) });
  }

  // Monthly: last 12 months, weekly data points
  const monthly: PlayerHistoryPoint[] = [];
  for (let w = 52; w >= 0; w--) {
    const daysAgo = w * 7;
    monthly.push({ timestamp: now - daysAgo * 86400000, players: generatePoint(daysAgo, currentPlayers * 0.9) });
  }

  // Yearly: last 3 years, monthly data points
  const yearly: PlayerHistoryPoint[] = [];
  for (let m = 36; m >= 0; m--) {
    const daysAgo = m * 30;
    const peakFactor = m > 24 ? 0.4 : m > 12 ? 0.7 : 1.0;
    yearly.push({
      timestamp: now - daysAgo * 86400000,
      players: generatePoint(daysAgo, peakPlayers * peakFactor),
    });
  }

  return { appid, daily, weekly, monthly, yearly };
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
