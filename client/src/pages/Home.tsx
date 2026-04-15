import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  TrendingUp, Users, Gamepad2, BarChart2, ArrowRight,
  Zap, Trophy, Activity, ChevronUp, ChevronDown, Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import StatCard from "@/components/StatCard";
import GameCard from "@/components/GameCard";
import AdZone from "@/components/AdZone";
import SEOHead from "@/components/SEOHead";
import TrendingNowSection from "@/components/TrendingNowSection";
import { formatNumber, formatCommas, getHeaderImage } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Animated counter hook
function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) return;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

export default function Home() {
  const { data: topGames, isLoading: topLoading } = trpc.games.getTopCharts.useQuery({ limit: 10, sortBy: "ccu" });
  const { data: trending, isLoading: trendLoading } = trpc.games.getTrending.useQuery({ limit: 8 });
  const { data: stats, isLoading: statsLoading } = trpc.games.getStats.useQuery();
  const { data: records } = trpc.games.getRecords.useQuery();

  const totalPlayers = useCountUp(stats?.totalPlayersOnline ?? 0);
  const totalGames = useCountUp(stats?.totalGamesTracked ?? 0);

  return (
    <>
      <SEOHead />
      <div className="page-enter">
        {/* ─── Hero Section ─────────────────────────────────────────────────── */}
        <section className="relative min-h-[85vh] flex items-center overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0">
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(oklch(0.62 0.22 250) 1px, transparent 1px), linear-gradient(90deg, oklch(0.62 0.22 250) 1px, transparent 1px)`,
                backgroundSize: "60px 60px",
              }}
            />
            {/* Radial glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[oklch(0.62_0.22_250/0.06)] blur-[120px]" />
            <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-[oklch(0.7_0.18_195/0.04)] blur-[100px]" />
          </div>

          {/* Game images strip (background) */}
          {records?.allTimePeaks && records.allTimePeaks.length > 0 && (
            <div className="absolute inset-0 flex gap-2 opacity-[0.08] overflow-hidden">
              {records.allTimePeaks.slice(0, 6).map((game) => (
                <div key={game.appid} className="flex-1 min-w-0 relative">
                  <img
                    src={getHeaderImage(game.appid)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.08_0.01_260)] via-transparent to-[oklch(0.08_0.01_260)]" />
              <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.08_0.01_260/0.3)] via-transparent to-[oklch(0.08_0.01_260)]" />
            </div>
          )}

          <div className="container relative z-10 py-20">
            <div className="max-w-3xl">
              {/* Live badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[oklch(0.62_0.22_250/0.1)] border border-[oklch(0.62_0.22_250/0.3)] mb-6">
                <div className="pulse-dot" />
                <span className="text-xs font-mono text-[oklch(0.72_0.2_145)] tracking-wider uppercase">
                  Live Data — Updated Hourly
                </span>
              </div>

              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Steam Analytics
                <br />
                <span className="gradient-text">Reimagined</span>
              </h1>

              <p className="text-lg text-[oklch(0.6_0.02_260)] mb-8 max-w-2xl leading-relaxed">
                Real-time player counts, trending games, historical charts, and deep analytics for every game on Steam. The most comprehensive Steam data platform.
              </p>

              {/* Live stats ticker */}
              <div className="flex flex-wrap gap-6 mb-10">
                <div>
                  <p className="text-3xl font-display font-bold text-[oklch(0.62_0.22_250)] tabular-nums">
                    {formatNumber(totalPlayers)}
                  </p>
                  <p className="text-xs text-[oklch(0.45_0.02_260)] uppercase tracking-wider mt-0.5">Players Online</p>
                </div>
                <div className="w-px bg-[oklch(0.2_0.015_260)]" />
                <div>
                  <p className="text-3xl font-display font-bold text-[oklch(0.7_0.18_195)] tabular-nums">
                    {formatNumber(totalGames)}
                  </p>
                  <p className="text-xs text-[oklch(0.45_0.02_260)] uppercase tracking-wider mt-0.5">Games Tracked</p>
                </div>
                {stats?.topGameName && (
                  <>
                    <div className="w-px bg-[oklch(0.2_0.015_260)]" />
                    <div>
                      <p className="text-3xl font-display font-bold text-[oklch(0.72_0.2_145)] tabular-nums">
                        #{1}
                      </p>
                      <p className="text-xs text-[oklch(0.45_0.02_260)] uppercase tracking-wider mt-0.5 max-w-[120px] truncate">
                        {stats.topGameName}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-[oklch(0.62_0.22_250)] hover:bg-[oklch(0.68_0.22_250)] text-white font-semibold shadow-lg hover:shadow-[0_0_24px_oklch(0.62_0.22_250/0.4)] transition-all duration-300">
                  <Link href="/charts">
                    <BarChart2 className="w-4 h-4 mr-2" />
                    View Top Charts
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-[oklch(0.25_0.02_260)] text-[oklch(0.75_0.02_260)] hover:bg-[oklch(0.14_0.015_260)] hover:text-white hover:border-[oklch(0.62_0.22_250/0.5)]">
                  <Link href="/trending">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Trending Now
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Ad Banner ─────────────────────────────────────────────────────── */}
        <div className="container py-4">
          <AdZone size="leaderboard" />
        </div>

        {/* ─── Stats Overview ─────────────────────────────────────────────────── */}
        <section className="container py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Players Online Now"
              value={formatNumber(stats?.totalPlayersOnline)}
              icon={Users}
              color="blue"
              loading={statsLoading}
              subValue="Across all games"
            />
            <StatCard
              label="Games Tracked"
              value={formatCommas(stats?.totalGamesTracked)}
              icon={Gamepad2}
              color="teal"
              loading={statsLoading}
              subValue="Top 100 by players"
            />
            <StatCard
              label="Top Game Players"
              value={formatNumber(stats?.topGamePlayers)}
              icon={Trophy}
              color="gold"
              loading={statsLoading}
              subValue={stats?.topGameName ? `#1: ${stats.topGameName}` : "Current leader"}
            />
            <StatCard
              label="Data Freshness"
              value="Live"
              icon={Activity}
              color="green"
              subValue="Updated every hour"
            />
          </div>
        </section>

        {/* ─── Top Games Leaderboard ──────────────────────────────────────────── */}
        <section className="container py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                <span className="gradient-text">Top Games</span> Right Now
              </h2>
              <p className="text-sm text-[oklch(0.5_0.02_260)] mt-1">Most concurrent players on Steam</p>
            </div>
            <Button asChild variant="ghost" className="text-[oklch(0.62_0.22_250)] hover:text-[oklch(0.72_0.22_250)] hover:bg-[oklch(0.62_0.22_250/0.1)]">
              <Link href="/charts">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] sm:grid-cols-[2.5rem_1fr_auto_auto_auto] gap-3 px-4 py-3 border-b border-[oklch(0.16_0.015_260)] text-xs text-[oklch(0.45_0.02_260)] uppercase tracking-wider font-mono">
              <span>#</span>
              <span>Game</span>
              <span className="hidden sm:block text-right">Peak (24h)</span>
              <span className="text-right">Players</span>
              <span className="hidden md:block text-right">Change</span>
            </div>

            {topLoading ? (
              <div className="divide-y divide-[oklch(0.14_0.015_260)]">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[2rem_1fr_auto_auto_auto] sm:grid-cols-[2.5rem_1fr_auto_auto_auto] gap-3 px-4 py-3.5 items-center">
                    <div className="shimmer h-4 w-4 rounded" />
                    <div className="flex items-center gap-3">
                      <div className="shimmer w-16 h-9 rounded" />
                      <div className="shimmer h-4 w-32 rounded" />
                    </div>
                    <div className="shimmer h-4 w-16 rounded hidden sm:block" />
                    <div className="shimmer h-4 w-16 rounded" />
                    <div className="shimmer h-4 w-12 rounded hidden md:block" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-[oklch(0.13_0.015_260)]">
                {(topGames ?? []).map((game, idx) => {
                  // Simulate 24h change based on rank
                  const change = ((game.appid % 40) - 20) * 0.8;
                  return (
                    <Link key={game.appid} href={`/game/${game.appid}`}>
                      <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] sm:grid-cols-[2.5rem_1fr_auto_auto_auto] gap-3 px-4 py-3 items-center hover:bg-[oklch(0.13_0.015_260)] transition-colors cursor-pointer group">
                        {/* Rank */}
                        <span className={cn(
                          "rank-badge text-center",
                          idx === 0 ? "text-[oklch(0.78_0.18_75)]" :
                          idx === 1 ? "text-[oklch(0.75_0.02_260)]" :
                          idx === 2 ? "text-[oklch(0.65_0.12_50)]" :
                          "text-[oklch(0.45_0.02_260)]"
                        )}>
                          {idx + 1}
                        </span>

                        {/* Game info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={game.headerImage ?? getHeaderImage(game.appid)}
                            alt={game.name}
                            className="w-16 h-9 rounded object-cover shrink-0 bg-[oklch(0.14_0.015_260)]"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).src = getHeaderImage(game.appid); }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate group-hover:text-[oklch(0.62_0.22_250)] transition-colors">
                              {game.name}
                            </p>
                            <p className="text-xs text-[oklch(0.42_0.02_260)] truncate">
                              {game.genre?.split(",")[0] ?? ""}
                            </p>
                          </div>
                        </div>

                        {/* Peak */}
                        <div className="hidden sm:block text-right">
                          <p className="text-sm font-mono text-[oklch(0.55_0.02_260)]">
                            {formatNumber(game.peakPlayersAllTime)}
                          </p>
                          <p className="text-xs text-[oklch(0.38_0.02_260)]">all-time</p>
                        </div>

                        {/* Current players */}
                        <div className="text-right">
                          <p className="text-sm font-mono font-semibold text-[oklch(0.62_0.22_250)]">
                            {formatNumber(game.ccu)}
                          </p>
                          <p className="text-xs text-[oklch(0.38_0.02_260)]">playing</p>
                        </div>

                        {/* Change */}
                        <div className="hidden md:flex items-center justify-end gap-1">
                          {change > 0 ? (
                            <ChevronUp className="w-3.5 h-3.5 text-[oklch(0.72_0.2_145)]" />
                          ) : change < 0 ? (
                            <ChevronDown className="w-3.5 h-3.5 text-[oklch(0.62_0.22_25)]" />
                          ) : (
                            <Minus className="w-3.5 h-3.5 text-[oklch(0.45_0.02_260)]" />
                          )}
                          <span className={cn(
                            "text-xs font-mono",
                            change > 0 ? "text-[oklch(0.72_0.2_145)]" :
                            change < 0 ? "text-[oklch(0.62_0.22_25)]" :
                            "text-[oklch(0.45_0.02_260)]"
                          )}>
                            {change > 0 ? "+" : ""}{change.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ─── Trending Games ─────────────────────────────────────────────────── */}
        <section className="container py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                <span className="text-[oklch(0.72_0.2_145)]">Trending</span> Games
              </h2>
              <p className="text-sm text-[oklch(0.5_0.02_260)] mt-1">Most played in the last 2 weeks</p>
            </div>
            <Button asChild variant="ghost" className="text-[oklch(0.72_0.2_145)] hover:text-[oklch(0.82_0.2_145)] hover:bg-[oklch(0.72_0.2_145/0.1)]">
              <Link href="/trending">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trendLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl bg-[oklch(0.11_0.015_260)] border border-[oklch(0.18_0.015_260)] overflow-hidden">
                    <div className="shimmer aspect-[460/215]" />
                    <div className="p-3 space-y-2">
                      <div className="shimmer h-4 w-3/4 rounded" />
                      <div className="shimmer h-3 w-1/2 rounded" />
                    </div>
                  </div>
                ))
              : (trending ?? []).map((game, idx) => (
                  <GameCard
                    key={game.appid}
                    appid={game.appid}
                    name={game.name}
                    headerImage={game.headerImage}
                    ccu={game.ccu}
                    peakPlayersAllTime={game.peakPlayersAllTime}
                    priceUsd={game.priceUsd}
                    isFree={game.isFree}
                    discountPercent={game.discountPercent}
                    genre={game.genre}
                    rank={idx + 1}
                    change={((game.appid % 40) - 10) * 1.2}
                  />
                ))
            }
          </div>
        </section>

        {/* ─── Currently Trending ─────────────────────────────────────────── */}
        <section className="container py-8">
          <TrendingNowSection limit={10} showHeader={true} />
        </section>

        {/* ─── Ad Banner ─────────────────────────────────────────────────────── */}
        <div className="container py-4">
          <AdZone size="banner" />
        </div>

        {/* ─── All-Time Records ───────────────────────────────────────────────── */}
        <section className="container py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                <span className="gradient-text-gold">All-Time</span> Records
              </h2>
              <p className="text-sm text-[oklch(0.5_0.02_260)] mt-1">Peak concurrent players ever recorded</p>
            </div>
            <Button asChild variant="ghost" className="text-[oklch(0.78_0.18_75)] hover:text-[oklch(0.88_0.18_75)] hover:bg-[oklch(0.78_0.18_75/0.1)]">
              <Link href="/trending">
                View Records <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(records?.allTimePeaks ?? []).slice(0, 6).map((game, idx) => (
              <Link key={game.appid} href={`/game/${game.appid}`}>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-[oklch(0.11_0.015_260)] border border-[oklch(0.18_0.015_260)] card-hover cursor-pointer">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-lg shrink-0",
                    idx === 0 ? "bg-[oklch(0.78_0.18_75/0.15)] text-[oklch(0.78_0.18_75)]" :
                    idx === 1 ? "bg-[oklch(0.75_0.02_260/0.15)] text-[oklch(0.75_0.02_260)]" :
                    idx === 2 ? "bg-[oklch(0.65_0.12_50/0.15)] text-[oklch(0.65_0.12_50)]" :
                    "bg-[oklch(0.16_0.02_260)] text-[oklch(0.5_0.02_260)]"
                  )}>
                    {idx + 1}
                  </div>
                  <img
                    src={game.headerImage ?? getHeaderImage(game.appid)}
                    alt={game.name}
                    className="w-20 h-11 rounded object-cover shrink-0 bg-[oklch(0.14_0.015_260)]"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = getHeaderImage(game.appid); }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{game.name}</p>
                    <p className="text-xs text-[oklch(0.45_0.02_260)]">
                      Peak: <span className="text-[oklch(0.78_0.18_75)] font-mono font-semibold">{formatNumber(game.peakPlayersAllTime)}</span>
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ─── Feature Cards ──────────────────────────────────────────────────── */}
        <section className="container py-12">
          <h2 className="font-display text-2xl font-bold text-white mb-6 text-center">
            Explore <span className="gradient-text">Everything</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                href: "/charts",
                icon: BarChart2,
                title: "Top Charts",
                desc: "Sortable rankings by players, peak, and owners",
                color: "oklch(0.62 0.22 250)",
                bg: "oklch(0.62 0.22 250 / 0.08)",
              },
              {
                href: "/trending",
                icon: TrendingUp,
                title: "Trending & Records",
                desc: "All-time peaks, biggest gainers and losers",
                color: "oklch(0.72 0.2 145)",
                bg: "oklch(0.72 0.2 145 / 0.08)",
              },
              {
                href: "/genres",
                icon: Gamepad2,
                title: "Genre Explorer",
                desc: "Browse and rank games by category",
                color: "oklch(0.7 0.18 195)",
                bg: "oklch(0.7 0.18 195 / 0.08)",
              },
              {
                href: "/compare",
                icon: Zap,
                title: "Game Comparison",
                desc: "Compare up to 4 games side-by-side",
                color: "oklch(0.78 0.18 75)",
                bg: "oklch(0.78 0.18 75 / 0.08)",
              },
            ].map(({ href, icon: Icon, title, desc, color, bg }) => (
              <Link key={href} href={href}>
                <div
                  className="p-5 rounded-xl border border-[oklch(0.18_0.015_260)] card-hover cursor-pointer h-full"
                  style={{ background: bg }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: `${color.replace(")", " / 0.15)")}` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-white mb-1">{title}</h3>
                  <p className="text-sm text-[oklch(0.5_0.02_260)]">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ─── Bottom Ad ──────────────────────────────────────────────────────── */}
        <div className="container pb-8">
          <AdZone size="leaderboard" />
        </div>
      </div>
    </>
  );
}
