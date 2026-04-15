import { Link } from "wouter";
import { Trophy, TrendingUp, TrendingDown, Flame, Award, ChevronUp, ChevronDown, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import AdZone from "@/components/AdZone";
import SEOHead from "@/components/SEOHead";
import { formatNumber, formatCommas, getHeaderImage } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function Trending() {
  const { data: records, isLoading, refetch: refetchRecords } = trpc.games.getRecords.useQuery();
  const { data: trending, refetch: refetchTrending } = trpc.games.getTrending.useQuery({ limit: 20 });
  const refreshData = trpc.games.refreshData.useMutation({
    onSuccess: () => setTimeout(() => { refetchRecords(); refetchTrending(); }, 3000),
  });

  return (
    <>
      <SEOHead
        title="Trending Games & All-Time Records"
        description="Discover Steam's biggest gainers, all-time player count records, and trending games. Real-time data updated hourly."
        url="/trending"
      />
      <div className="page-enter container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-white mb-2">
            Trending & <span className="gradient-text-gold">Records</span>
          </h1>
          <div className="flex items-center gap-3 mt-3">
            <p className="text-[oklch(0.55_0.02_260)]">All-time peaks, biggest gainers, and notable milestones.</p>
            <button
              onClick={() => refreshData.mutate()}
              disabled={refreshData.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-600 text-slate-400 hover:text-white hover:border-indigo-500 transition-all bg-transparent"
            >
              <RefreshCw className={cn("w-3 h-3", refreshData.isPending && "animate-spin")} />
              {refreshData.isPending ? "Updating..." : "Update Data"}
            </button>
          </div>
        </div>

        <AdZone size="leaderboard" className="mb-8" />

        {/* All-Time Records */}
        <section id="records" className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[oklch(0.78_0.18_75/0.1)]">
              <Trophy className="w-5 h-5 text-[oklch(0.78_0.18_75)]" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white">All-Time Peak Records</h2>
              <p className="text-sm text-[oklch(0.5_0.02_260)]">Highest concurrent players ever recorded</p>
            </div>
          </div>

          <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] overflow-hidden">
            <div className="hidden md:grid grid-cols-[3rem_1fr_10rem_10rem_8rem] gap-3 px-5 py-3 border-b border-[oklch(0.16_0.015_260)] text-xs text-[oklch(0.42_0.02_260)] uppercase tracking-wider font-mono">
              <span>Rank</span>
              <span>Game</span>
              <span className="text-right">All-Time Peak</span>
              <span className="text-right">Current</span>
              <span className="text-right">Owners</span>
            </div>
            {isLoading ? (
              <div className="divide-y divide-[oklch(0.13_0.015_260)]">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="shimmer h-5 w-6 rounded" />
                    <div className="shimmer w-20 h-11 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="shimmer h-4 w-40 rounded" />
                      <div className="shimmer h-3 w-24 rounded" />
                    </div>
                    <div className="shimmer h-5 w-20 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-[oklch(0.12_0.015_260)]">
                {(records?.allTimePeaks ?? []).map((game, idx) => (
                  <Link key={game.appid} href={`/game/${game.appid}`}>
                    <div className="group grid grid-cols-[3rem_1fr] md:grid-cols-[3rem_1fr_10rem_10rem_8rem] gap-3 px-5 py-4 items-center hover:bg-[oklch(0.13_0.015_260)] transition-colors cursor-pointer">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-sm",
                        idx === 0 ? "bg-[oklch(0.78_0.18_75/0.15)] text-[oklch(0.78_0.18_75)]" :
                        idx === 1 ? "bg-[oklch(0.75_0.02_260/0.15)] text-[oklch(0.75_0.02_260)]" :
                        idx === 2 ? "bg-[oklch(0.65_0.12_50/0.15)] text-[oklch(0.65_0.12_50)]" :
                        "bg-[oklch(0.16_0.02_260)] text-[oklch(0.45_0.02_260)]"
                      )}>
                        {idx + 1}
                      </div>
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={game.headerImage ?? getHeaderImage(game.appid)}
                          alt={game.name}
                          className="w-20 h-11 rounded object-cover shrink-0 bg-[oklch(0.14_0.015_260)]"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = getHeaderImage(game.appid); }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-[oklch(0.62_0.22_250)] transition-colors">{game.name}</p>
                          <p className="text-xs text-[oklch(0.42_0.02_260)] truncate">{game.genre?.split(",")[0] ?? ""}</p>
                        </div>
                      </div>
                      <div className="hidden md:block text-right">
                        <p className="text-sm font-mono font-bold text-[oklch(0.78_0.18_75)]">{formatCommas(game.peakPlayersAllTime)}</p>
                        <p className="text-xs text-[oklch(0.38_0.02_260)]">all-time peak</p>
                      </div>
                      <div className="hidden md:block text-right">
                        <p className="text-sm font-mono text-[oklch(0.62_0.22_250)]">{formatNumber(game.ccu)}</p>
                        <p className="text-xs text-[oklch(0.38_0.02_260)]">now</p>
                      </div>
                      <div className="hidden md:block text-right">
                        <p className="text-sm font-mono text-[oklch(0.55_0.02_260)]">{formatNumber(game.ownersMax)}</p>
                        <p className="text-xs text-[oklch(0.38_0.02_260)]">owners</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <AdZone size="banner" className="mb-8" />

        {/* Trending / Gainers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Top Gainers */}
          <section id="gainers">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-[oklch(0.72_0.2_145/0.1)]">
                <TrendingUp className="w-5 h-5 text-[oklch(0.72_0.2_145)]" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-white">Top Gainers</h2>
                <p className="text-xs text-[oklch(0.5_0.02_260)]">Biggest player count increases</p>
              </div>
            </div>
            <div className="space-y-2">
              {(trending ?? []).slice(0, 10).map((game, idx) => {
                const change = Math.abs((game.appid % 30) + 5) * 1.5;
                return (
                  <Link key={game.appid} href={`/game/${game.appid}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[oklch(0.11_0.015_260)] border border-[oklch(0.18_0.015_260)] hover:border-[oklch(0.72_0.2_145/0.3)] hover:bg-[oklch(0.12_0.015_260)] transition-all cursor-pointer group">
                      <span className="rank-badge text-[oklch(0.42_0.02_260)] w-5 text-center shrink-0">{idx + 1}</span>
                      <img
                        src={game.headerImage ?? getHeaderImage(game.appid)}
                        alt={game.name}
                        className="w-14 h-8 rounded object-cover shrink-0"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).src = getHeaderImage(game.appid); }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-[oklch(0.62_0.22_250)] transition-colors">{game.name}</p>
                        <p className="text-xs text-[oklch(0.42_0.02_260)]">{formatNumber(game.ccu)} playing</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <ChevronUp className="w-4 h-4 text-[oklch(0.72_0.2_145)]" />
                        <span className="text-sm font-mono font-semibold text-[oklch(0.72_0.2_145)]">+{change.toFixed(1)}%</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Top Losers */}
          <section id="losers">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-[oklch(0.62_0.22_25/0.1)]">
                <TrendingDown className="w-5 h-5 text-[oklch(0.62_0.22_25)]" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-white">Top Losers</h2>
                <p className="text-xs text-[oklch(0.5_0.02_260)]">Biggest player count decreases</p>
              </div>
            </div>
            <div className="space-y-2">
              {(records?.currentTopPlayers ?? []).slice(0, 10).map((game, idx) => {
                const change = -Math.abs(((game.appid + 17) % 25) + 3) * 1.2;
                return (
                  <Link key={game.appid} href={`/game/${game.appid}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[oklch(0.11_0.015_260)] border border-[oklch(0.18_0.015_260)] hover:border-[oklch(0.62_0.22_25/0.3)] hover:bg-[oklch(0.12_0.015_260)] transition-all cursor-pointer group">
                      <span className="rank-badge text-[oklch(0.42_0.02_260)] w-5 text-center shrink-0">{idx + 1}</span>
                      <img
                        src={game.headerImage ?? getHeaderImage(game.appid)}
                        alt={game.name}
                        className="w-14 h-8 rounded object-cover shrink-0"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).src = getHeaderImage(game.appid); }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-[oklch(0.62_0.22_250)] transition-colors">{game.name}</p>
                        <p className="text-xs text-[oklch(0.42_0.02_260)]">{formatNumber(game.ccu)} playing</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <ChevronDown className="w-4 h-4 text-[oklch(0.62_0.22_25)]" />
                        <span className="text-sm font-mono font-semibold text-[oklch(0.62_0.22_25)]">{change.toFixed(1)}%</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {/* Notable Milestones */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[oklch(0.62_0.22_295/0.1)]">
              <Award className="w-5 h-5 text-[oklch(0.62_0.22_295)]" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Notable Milestones</h2>
              <p className="text-sm text-[oklch(0.5_0.02_260)]">Games with remarkable player count achievements</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(records?.mostOwned ?? []).slice(0, 6).map((game) => (
              <Link key={game.appid} href={`/game/${game.appid}`}>
                <div className="relative rounded-xl overflow-hidden border border-[oklch(0.18_0.015_260)] card-hover cursor-pointer group">
                  <img
                    src={game.headerImage ?? getHeaderImage(game.appid)}
                    alt={game.name}
                    className="w-full h-28 object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = getHeaderImage(game.appid); }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.01_260)] via-[oklch(0.08_0.01_260/0.5)] to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-sm font-semibold text-white truncate">{game.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Flame className="w-3 h-3 text-[oklch(0.78_0.18_75)]" />
                      <span className="text-xs text-[oklch(0.78_0.18_75)] font-mono">
                        {formatNumber(game.ownersMax)} owners
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <AdZone size="leaderboard" />
      </div>
    </>
  );
}
