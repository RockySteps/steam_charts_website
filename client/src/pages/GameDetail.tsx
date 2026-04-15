import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  Users, TrendingUp, Star, ExternalLink, Tag, Monitor,
  Apple, Globe, Calendar, Trophy, Clock, BarChart2,
  ChevronLeft, DollarSign, Gamepad2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { trpc } from "@/lib/trpc";
import AdZone from "@/components/AdZone";
import SEOHead from "@/components/SEOHead";
import StatCard from "@/components/StatCard";
import {
  formatNumber, formatCommas, formatPrice, formatPlaytime,
  formatDate, getSteamStoreUrl, getPositivePercent, getHeaderImage
} from "@/lib/utils";
import { cn } from "@/lib/utils";

type Period = "daily" | "weekly" | "monthly" | "yearly";

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Last 30 Days",
  weekly: "Last 12 Weeks",
  monthly: "Last 12 Months",
  yearly: "Last 3 Years",
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const date = label ? new Date(Number(label)) : null;
  return (
    <div className="bg-[oklch(0.14_0.015_260)] border border-[oklch(0.25_0.02_260)] rounded-lg p-3 shadow-xl">
      <p className="text-xs text-[oklch(0.5_0.02_260)] mb-1">
        {date?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
      <p className="text-base font-mono font-bold text-[oklch(0.62_0.22_250)]">
        {formatCommas(payload[0]?.value)}
      </p>
      <p className="text-xs text-[oklch(0.45_0.02_260)]">players</p>
    </div>
  );
}

export default function GameDetail() {
  const params = useParams<{ appid: string }>();
  const appid = parseInt(params.appid ?? "0", 10);
  const [period, setPeriod] = useState<Period>("weekly");

  const { data: game, isLoading: gameLoading } = trpc.games.getGameDetail.useQuery({ appid });
  const { data: history, isLoading: historyLoading } = trpc.games.getPlayerHistory.useQuery({ appid, period });
  const { data: topGames } = trpc.games.getTrending.useQuery({ limit: 6 });

  if (!gameLoading && !game) {
    return (
      <div className="container py-20 text-center">
        <Gamepad2 className="w-16 h-16 text-[oklch(0.3_0.02_260)] mx-auto mb-4" />
        <h2 className="font-display text-2xl text-white mb-2">Game Not Found</h2>
        <p className="text-[oklch(0.5_0.02_260)] mb-6">This game isn't in our database yet.</p>
        <Button asChild>
          <Link href="/charts">← Back to Charts</Link>
        </Button>
      </div>
    );
  }

  const positivePercent = game ? getPositivePercent(game.positiveReviews ?? 0, game.totalReviews ?? 0) : 0;
  const tags = Array.isArray(game?.tags) ? game.tags as string[] : [];
  const genres = game?.genre?.split(", ").filter(Boolean) ?? [];
  const screenshots = Array.isArray(game?.screenshots) ? game.screenshots as string[] : [];
  const platforms = game?.platforms as { windows?: boolean; mac?: boolean; linux?: boolean } | null;

  // Format chart data
  const chartData = (history ?? []).map((p) => ({
    time: p.timestamp,
    players: p.players,
  }));

  const maxPlayers = chartData.reduce((max, p) => Math.max(max, p.players), 0);

  return (
    <>
      <SEOHead
        title={game ? `${game.name} — Player Stats & Analytics` : "Game Analytics"}
        description={game ? `Live player count, historical charts, and analytics for ${game.name} on Steam. Current: ${formatNumber(game.ccu)} players.` : ""}
        image={game?.headerImage ?? undefined}
        url={`/game/${appid}`}
        jsonLd={game ? {
          "@context": "https://schema.org",
          "@type": "VideoGame",
          "name": game.name,
          "description": game.shortDescription ?? "",
          "url": getSteamStoreUrl(appid),
          "image": game.headerImage ?? getHeaderImage(appid),
          "author": { "@type": "Organization", "name": game.developer ?? "" },
          "publisher": { "@type": "Organization", "name": game.publisher ?? "" },
        } : undefined}
      />
      <div className="page-enter">
        {/* Hero banner */}
        <div className="relative">
          {game?.background || game?.headerImage ? (
            <div className="absolute inset-0 h-72 overflow-hidden">
              <img
                src={game.background || game.headerImage || ""}
                alt=""
                className="w-full h-full object-cover opacity-20"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[oklch(0.08_0.01_260)]" />
              <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.08_0.01_260/0.6)] to-transparent" />
            </div>
          ) : null}

          <div className="container relative z-10 pt-8 pb-6">
            {/* Back button */}
            <Button asChild variant="ghost" size="sm" className="mb-6 text-[oklch(0.55_0.02_260)] hover:text-white">
              <Link href="/charts">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Charts
              </Link>
            </Button>

            {gameLoading ? (
              <div className="flex gap-6">
                <div className="shimmer w-48 h-28 rounded-lg" />
                <div className="flex-1 space-y-3">
                  <div className="shimmer h-8 w-64 rounded" />
                  <div className="shimmer h-4 w-48 rounded" />
                  <div className="shimmer h-4 w-32 rounded" />
                </div>
              </div>
            ) : game ? (
              <div className="flex flex-col sm:flex-row gap-6">
                <img
                  src={game.headerImage ?? getHeaderImage(appid)}
                  alt={game.name}
                  className="w-full sm:w-56 h-32 rounded-xl object-cover border border-[oklch(0.22_0.015_260)] shadow-2xl"
                  onError={(e) => { (e.target as HTMLImageElement).src = getHeaderImage(appid); }}
                />
                <div className="flex-1 min-w-0">
                  <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">{game.name}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-[oklch(0.5_0.02_260)] mb-3">
                    {game.developer && <span>{game.developer}</span>}
                    {game.releaseDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(game.releaseDate)}
                      </span>
                    )}
                    {platforms && (
                      <span className="flex items-center gap-1.5">
                        {platforms.windows && <Monitor className="w-3.5 h-3.5" />}
                        {platforms.mac && <Apple className="w-3.5 h-3.5" />}
                        {platforms.linux && <Globe className="w-3.5 h-3.5" />}
                      </span>
                    )}
                  </div>

                  {/* Live player count */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.62_0.22_250/0.1)] border border-[oklch(0.62_0.22_250/0.3)]">
                      <div className="pulse-dot" />
                      <span className="font-display text-2xl font-bold text-[oklch(0.62_0.22_250)] tabular-nums">
                        {formatCommas(game.ccu)}
                      </span>
                      <span className="text-sm text-[oklch(0.55_0.02_260)]">playing now</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {genres.slice(0, 4).map((g) => (
                      <Link key={g} href={`/genres?g=${encodeURIComponent(g)}`}>
                        <span className="px-2.5 py-1 rounded-md text-xs bg-[oklch(0.62_0.22_250/0.1)] text-[oklch(0.62_0.22_250)] border border-[oklch(0.62_0.22_250/0.2)] hover:bg-[oklch(0.62_0.22_250/0.2)] transition-colors cursor-pointer">
                          {g}
                        </span>
                      </Link>
                    ))}
                    <a
                      href={getSteamStoreUrl(appid)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-[oklch(0.16_0.02_260)] text-[oklch(0.55_0.02_260)] border border-[oklch(0.22_0.015_260)] hover:text-white hover:border-[oklch(0.35_0.02_260)] transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Steam Store
                    </a>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="container py-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Current Players" value={formatNumber(game?.ccu)} icon={Users} color="blue" loading={gameLoading} />
            <StatCard label="All-Time Peak" value={formatNumber(game?.peakPlayersAllTime)} icon={Trophy} color="gold" loading={gameLoading} />
            <StatCard label="Avg Playtime" value={formatPlaytime(game?.averagePlaytimeForever)} icon={Clock} color="teal" loading={gameLoading} />
            <StatCard
              label="Review Score"
              value={positivePercent ? `${positivePercent}%` : "—"}
              icon={Star}
              color={positivePercent >= 70 ? "green" : positivePercent >= 50 ? "gold" : "red"}
              loading={gameLoading}
              subValue={game?.reviewScoreDesc || undefined}
            />
          </div>

          {/* Ad */}
          <AdZone size="leaderboard" className="mb-8" />

          {/* Player History Chart */}
          <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-xl font-bold text-white">Player Count History</h2>
                <p className="text-sm text-[oklch(0.5_0.02_260)]">{PERIOD_LABELS[period]}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      period === p
                        ? "bg-[oklch(0.62_0.22_250/0.15)] text-[oklch(0.62_0.22_250)] border border-[oklch(0.62_0.22_250/0.3)]"
                        : "bg-[oklch(0.14_0.015_260)] text-[oklch(0.5_0.02_260)] border border-[oklch(0.2_0.015_260)] hover:text-white"
                    )}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {historyLoading ? (
              <div className="shimmer h-64 rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="playerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.62 0.22 250)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.62 0.22 250)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.015 260)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      if (period === "daily") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      if (period === "weekly") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      if (period === "monthly") return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
                      return d.getFullYear().toString();
                    }}
                    tick={{ fill: "oklch(0.45 0.02 260)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v) => formatNumber(v)}
                    tick={{ fill: "oklch(0.45 0.02 260)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {maxPlayers > 0 && (
                    <ReferenceLine
                      y={maxPlayers}
                      stroke="oklch(0.78 0.18 75)"
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                      label={{ value: `Peak: ${formatNumber(maxPlayers)}`, fill: "oklch(0.78 0.18 75)", fontSize: 11, position: "insideTopRight" }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="players"
                    stroke="oklch(0.62 0.22 250)"
                    strokeWidth={2}
                    fill="url(#playerGradient)"
                    dot={false}
                    activeDot={{ r: 4, fill: "oklch(0.62 0.22 250)", stroke: "oklch(0.08 0.01 260)", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Game Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              {game?.shortDescription && (
                <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-6">
                  <h3 className="font-display text-lg font-bold text-white mb-3">About</h3>
                  <p className="text-sm text-[oklch(0.6_0.02_260)] leading-relaxed">{game.shortDescription}</p>
                </div>
              )}

              {/* Detailed Stats */}
              <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-6">
                <h3 className="font-display text-lg font-bold text-white mb-4">Game Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Current Players", value: formatCommas(game?.ccu), color: "text-[oklch(0.62_0.22_250)]" },
                    { label: "All-Time Peak", value: formatCommas(game?.peakPlayersAllTime), color: "text-[oklch(0.78_0.18_75)]" },
                    { label: "Total Owners", value: game?.ownersMax ? `${formatNumber(game.ownersMin)}–${formatNumber(game.ownersMax)}` : "—", color: "text-[oklch(0.7_0.18_195)]" },
                    { label: "Avg Playtime (All)", value: formatPlaytime(game?.averagePlaytimeForever), color: "text-[oklch(0.72_0.2_145)]" },
                    { label: "Avg Playtime (2wk)", value: formatPlaytime(game?.averagePlaytime2weeks), color: "text-[oklch(0.72_0.2_145)]" },
                    { label: "Total Reviews", value: formatCommas(game?.totalReviews), color: "text-white" },
                    { label: "Positive Reviews", value: game?.positiveReviews ? `${formatCommas(game.positiveReviews)} (${positivePercent}%)` : "—", color: "text-[oklch(0.72_0.2_145)]" },
                    { label: "Metacritic Score", value: game?.metacriticScore ? String(game.metacriticScore) : "—", color: "text-[oklch(0.62_0.22_250)]" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-xs text-[oklch(0.42_0.02_260)] uppercase tracking-wide font-mono">{label}</span>
                      <span className={cn("text-sm font-semibold tabular-nums", color)}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Screenshots */}
              {screenshots.length > 0 && (
                <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-6">
                  <h3 className="font-display text-lg font-bold text-white mb-4">Screenshots</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {screenshots.slice(0, 6).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt={`Screenshot ${i + 1}`}
                          className="w-full aspect-video object-cover rounded-lg hover:opacity-80 transition-opacity"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Price & Links */}
              <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-5">
                <h3 className="font-display text-base font-bold text-white mb-4">Purchase</h3>
                <div className="mb-4">
                  {game?.isFree ? (
                    <p className="text-2xl font-display font-bold text-[oklch(0.72_0.2_145)]">Free to Play</p>
                  ) : game?.priceUsd != null ? (
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-display font-bold text-white">{formatPrice(game.priceUsd)}</p>
                      {game.discountPercent && game.discountPercent > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[oklch(0.72_0.2_145)] text-white text-xs font-bold">
                          -{game.discountPercent}%
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
                <a
                  href={getSteamStoreUrl(appid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[oklch(0.62_0.22_250)] hover:bg-[oklch(0.68_0.22_250)] text-white text-sm font-semibold transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Steam
                </a>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-5">
                  <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[oklch(0.5_0.02_260)]" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded text-xs bg-[oklch(0.16_0.02_260)] text-[oklch(0.5_0.02_260)] border border-[oklch(0.22_0.015_260)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ad sidebar */}
              <AdZone size="rectangle" />

              {/* Related games */}
              <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-5">
                <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[oklch(0.5_0.02_260)]" />
                  Top Games
                </h3>
                <div className="space-y-2">
                  {(topGames ?? []).filter((g) => g.appid !== appid).slice(0, 5).map((g, i) => (
                    <Link key={g.appid} href={`/game/${g.appid}`}>
                      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-[oklch(0.14_0.015_260)] transition-colors cursor-pointer">
                        <span className="rank-badge text-[oklch(0.42_0.02_260)] w-4 shrink-0">{i + 1}</span>
                        <img
                          src={g.headerImage ?? getHeaderImage(g.appid)}
                          alt={g.name}
                          className="w-12 h-7 rounded object-cover shrink-0"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = getHeaderImage(g.appid); }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-white truncate">{g.name}</p>
                          <p className="text-xs text-[oklch(0.62_0.22_250)] font-mono">{formatNumber(g.ccu)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom ad */}
          <AdZone size="leaderboard" className="mt-8" />
        </div>
      </div>
    </>
  );
}
