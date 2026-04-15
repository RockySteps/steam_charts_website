import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  TrendingUp, TrendingDown, Flame, ChevronRight,
  ArrowUpRight, ArrowDownRight, Activity, RefreshCw
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatChange(n: number): string {
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "−";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs.toLocaleString()}`;
}

function formatPct(n: number): string {
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${abs.toFixed(1)}%`;
}

// ─── Mini Sparkline ───────────────────────────────────────────────────────────

function MiniSparkline({ ccu, prevCcu, isGainer }: { ccu: number; prevCcu: number; isGainer: boolean }) {
  // Generate a simple 7-point sparkline using ccu/prevCcu as anchors
  const points = useMemo(() => {
    const start = prevCcu > 0 ? prevCcu : ccu * 0.8;
    const end = ccu;
    const pts: number[] = [];
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      // Add slight noise for visual interest
      const base = start + (end - start) * t;
      const noise = base * 0.06 * (Math.sin(i * 2.5) * 0.5 + 0.5);
      pts.push(Math.max(0, base + (isGainer ? noise : -noise)));
    }
    pts[6] = end;
    return pts;
  }, [ccu, prevCcu, isGainer]);

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 64;
  const h = 28;
  const pad = 2;

  const pathD = points
    .map((v, i) => {
      const x = pad + (i / (points.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const color = isGainer ? "#34d399" : "#f87171";
  const fillId = `spark-fill-${isGainer ? "g" : "l"}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <path
        d={`${pathD} L ${(w - pad).toFixed(1)} ${h} L ${pad} ${h} Z`}
        fill={`url(#${fillId})`}
      />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      <circle
        cx={(pad + (w - pad * 2)).toFixed(1)}
        cy={(h - pad - ((points[6]! - min) / range) * (h - pad * 2)).toFixed(1)}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

// ─── Game Row ─────────────────────────────────────────────────────────────────

interface TrendingGame {
  rank: number;
  appid: number;
  name: string;
  headerImage: string;
  ccu: number;
  prevCcu: number;
  change: number;
  changePct: number;
  genre: string;
  reviewScore: number;
  peakPlayersAllTime: number;
}

function TrendingGameRow({ game, isGainer }: { game: TrendingGame; isGainer: boolean }) {
  const isTopGainer = isGainer && game.rank <= 3;
  return (
    <Link href={`/game/${game.appid}`}>
      <div className={cn(
        "group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer",
        "hover:bg-[oklch(0.14_0.015_260)] border border-transparent hover:border-[oklch(0.2_0.015_260)]"
      )}>
        {/* Rank + live pulse for top 3 gainers */}
        <span className="w-6 flex items-center justify-center shrink-0">
          {isTopGainer ? (
            <span className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
          ) : (
            <span className="text-xs font-mono text-[oklch(0.4_0.02_260)]">{game.rank}</span>
          )}
        </span>

        {/* Thumbnail */}
        <div className="relative w-14 h-8 rounded-md overflow-hidden shrink-0 bg-[oklch(0.12_0.015_260)]">
          <img
            src={game.headerImage}
            alt={game.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {/* Trend overlay glow */}
          <div className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
            isGainer
              ? "bg-gradient-to-r from-emerald-500/10 to-transparent"
              : "bg-gradient-to-r from-red-500/10 to-transparent"
          )} />
        </div>

        {/* Name + Genre */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
            {game.name}
          </p>
          <p className="text-xs text-[oklch(0.42_0.02_260)] truncate">
            {game.genre?.split(", ")[0] ?? "Game"}
          </p>
        </div>

        {/* Sparkline */}
        <div className="hidden sm:block shrink-0">
          <MiniSparkline ccu={game.ccu} prevCcu={game.prevCcu} isGainer={isGainer} />
        </div>

        {/* Current players */}
        <div className="text-right shrink-0 min-w-[4rem]">
          <p className="text-sm font-bold font-mono text-white">
            {formatNumber(game.ccu)}
          </p>
          <p className="text-xs text-[oklch(0.42_0.02_260)]">playing</p>
        </div>

        {/* Change badge */}
        <div className={cn(
          "flex flex-col items-end shrink-0 min-w-[4.5rem]",
        )}>
          <span className={cn(
            "flex items-center gap-0.5 text-sm font-bold font-mono",
            isGainer ? "text-emerald-400" : "text-red-400"
          )}>
            {isGainer
              ? <ArrowUpRight className="w-3.5 h-3.5" />
              : <ArrowDownRight className="w-3.5 h-3.5" />
            }
            {formatChange(game.change)}
          </span>
          <span className={cn(
            "text-xs font-mono",
            isGainer ? "text-emerald-500/80" : "text-red-500/80"
          )}>
            {formatPct(game.changePct)}
          </span>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-[oklch(0.35_0.02_260)] group-hover:text-indigo-400 transition-colors shrink-0" />
      </div>
    </Link>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="shimmer w-6 h-4 rounded" />
      <div className="shimmer w-14 h-8 rounded-md" />
      <div className="flex-1 space-y-1.5">
        <div className="shimmer h-3.5 w-32 rounded" />
        <div className="shimmer h-2.5 w-20 rounded" />
      </div>
      <div className="shimmer w-16 h-8 rounded hidden sm:block" />
      <div className="space-y-1 text-right">
        <div className="shimmer h-3.5 w-14 rounded" />
        <div className="shimmer h-2.5 w-10 rounded" />
      </div>
      <div className="space-y-1 text-right">
        <div className="shimmer h-3.5 w-12 rounded" />
        <div className="shimmer h-2.5 w-10 rounded" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TabType = "gainers" | "losers";

interface TrendingNowSectionProps {
  /** Max number of games to show per tab */
  limit?: number;
  /** Show the section title and description */
  showHeader?: boolean;
  /** Additional CSS classes on the root element */
  className?: string;
}

export default function TrendingNowSection({
  limit = 10,
  showHeader = true,
  className,
}: TrendingNowSectionProps) {
  const [tab, setTab] = useState<TabType>("gainers");

  const { data: gainers, isLoading: loadingGainers, refetch: refetchGainers } =
    trpc.games.getTrendingNow.useQuery({ type: "gainers", limit, minCcu: 50 }, {
      refetchInterval: 120_000, // refresh every 2 minutes
    });

  const { data: losers, isLoading: loadingLosers, refetch: refetchLosers } =
    trpc.games.getTrendingNow.useQuery({ type: "losers", limit, minCcu: 50 }, {
      refetchInterval: 120_000,
    });

  const isLoading = tab === "gainers" ? loadingGainers : loadingLosers;
  const games = (tab === "gainers" ? gainers : losers) ?? [];
  const isGainer = tab === "gainers";

  // Fallback: if no prevCcu data yet (first crawl), show top games with simulated change
  const hasMeaningfulData = games.some((g) => Math.abs(g.change) > 0);

  function handleRefresh() {
    refetchGainers();
    refetchLosers();
  }

  return (
    <section className={cn("w-full", className)}>
      {showHeader && (
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[oklch(0.78_0.22_30/0.12)]">
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                Currently <span className="gradient-text">Trending</span>
              </h2>
              <p className="text-sm text-[oklch(0.5_0.02_260)] mt-0.5">
                Real-time player count changes — updated every crawl cycle
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 text-slate-400 hover:text-white hover:border-indigo-500 transition-all bg-transparent mt-1"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[oklch(0.10_0.012_260)] border border-[oklch(0.16_0.015_260)] mb-4 w-fit">
        <button
          onClick={() => setTab("gainers")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            tab === "gainers"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-[oklch(0.5_0.02_260)] hover:text-white"
          )}
        >
          <TrendingUp className="w-4 h-4" />
          Top Gainers
          {gainers && gainers.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono">
              {gainers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("losers")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            tab === "losers"
              ? "bg-red-500/15 text-red-400 border border-red-500/30"
              : "text-[oklch(0.5_0.02_260)] hover:text-white"
          )}
        >
          <TrendingDown className="w-4 h-4" />
          Top Losers
          {losers && losers.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-mono">
              {losers.length}
            </span>
          )}
        </button>
      </div>

      {/* Table Header */}
      <div className="hidden sm:grid grid-cols-[1.5rem_3.5rem_1fr_4rem_4.5rem_4.5rem_1rem] gap-3 px-4 py-2 text-xs font-mono uppercase tracking-wider text-[oklch(0.38_0.02_260)] border-b border-[oklch(0.14_0.015_260)] mb-1">
        <span>#</span>
        <span></span>
        <span>Game</span>
        <span className="text-right hidden lg:block">Trend</span>
        <span className="text-right">Players</span>
        <span className="text-right">Change</span>
        <span></span>
      </div>

      {/* Game List */}
      <div className="rounded-xl border border-[oklch(0.15_0.015_260)] bg-[oklch(0.09_0.01_260)] overflow-hidden divide-y divide-[oklch(0.12_0.012_260)]">
        {isLoading ? (
          Array.from({ length: limit }).map((_, i) => <SkeletonRow key={i} />)
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Activity className="w-8 h-8 text-[oklch(0.35_0.02_260)]" />
            <p className="text-sm text-[oklch(0.45_0.02_260)] text-center">
              {isGainer
                ? "No gainers detected yet — data populates as the crawler runs."
                : "No losers detected yet — data populates as the crawler runs."}
            </p>
          </div>
        ) : !hasMeaningfulData ? (
          // Show games but with a note that real change data is still being collected
          <>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[oklch(0.12_0.015_260)] border-b border-[oklch(0.16_0.015_260)]">
              <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-400/80">
                Collecting baseline data — real change metrics will appear after the next crawl cycle completes.
              </p>
            </div>
            {games.map((game) => (
              <TrendingGameRow key={game.appid} game={game} isGainer={isGainer} />
            ))}
          </>
        ) : (
          games.map((game) => (
            <TrendingGameRow key={game.appid} game={game} isGainer={isGainer} />
          ))
        )}
      </div>

      {/* Footer */}
      {games.length > 0 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <p className="text-xs text-[oklch(0.38_0.02_260)]">
            Showing top {games.length} {isGainer ? "gainers" : "losers"} by absolute player change
          </p>
          <Link href="/trending">
            <span className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer flex items-center gap-1">
              View all trending <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
      )}
    </section>
  );
}
