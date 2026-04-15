import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatCommas(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

export function formatPrice(price: number | null | undefined, isFree?: number | boolean): string {
  if (isFree) return "Free";
  if (price == null) return "—";
  if (price === 0) return "Free";
  return `$${price.toFixed(2)}`;
}

export function formatPlaytime(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  const hours = Math.round(minutes / 60);
  if (hours >= 1000) return `${(hours / 1000).toFixed(1)}K hrs`;
  return `${hours.toLocaleString()} hrs`;
}

export function formatChange(pct: number | null | undefined): string {
  if (pct == null) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function getTrendClass(change: number): string {
  if (change > 0) return "trend-up";
  if (change < 0) return "trend-down";
  return "trend-neutral";
}

export function getReviewInfo(score: number, desc: string): { color: string; label: string } {
  if (desc) return {
    label: desc,
    color: score >= 7 ? "oklch(0.72 0.2 145)" : score >= 4 ? "oklch(0.78 0.18 75)" : "oklch(0.62 0.22 25)",
  };
  if (score >= 9) return { label: "Overwhelmingly Positive", color: "oklch(0.72 0.2 145)" };
  if (score >= 8) return { label: "Very Positive", color: "oklch(0.72 0.2 145)" };
  if (score >= 7) return { label: "Mostly Positive", color: "oklch(0.72 0.2 145)" };
  if (score >= 5) return { label: "Mixed", color: "oklch(0.78 0.18 75)" };
  return { label: "Mostly Negative", color: "oklch(0.62 0.22 25)" };
}

export function getSteamStoreUrl(appid: number): string {
  return `https://store.steampowered.com/app/${appid}/`;
}

export function getHeaderImage(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

export function getCapsuleImage(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_231x87.jpg`;
}

export function getPositivePercent(positive: number, total: number): number {
  if (!total) return 0;
  return Math.round((positive / total) * 100);
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch { return dateStr; }
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
