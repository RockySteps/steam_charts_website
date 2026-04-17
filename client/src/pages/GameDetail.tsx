import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  Users, Star, ExternalLink, Tag, Monitor,
  Apple, Globe, Calendar, Trophy, Clock, BarChart2,
  ChevronLeft, Gamepad2, RefreshCw, MessageSquare, Table2,
  Newspaper, Cpu, Info, ThumbsUp, ThumbsDown, Award,
  Languages, Package, Shield, Headphones, ChevronDown, ChevronUp,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import AdZone from "@/components/AdZone";
import SEOHead from "@/components/SEOHead";
import StatCard from "@/components/StatCard";
import HighchartsPlayerChart from "@/components/HighchartsPlayerChart";
import MonthlyStatsTable from "@/components/MonthlyStatsTable";
import SteamReviews from "@/components/SteamReviews";
import {
  formatNumber, formatCommas, formatPrice, formatPlaytime,
  formatDate, getSteamStoreUrl, getPositivePercent, getHeaderImage
} from "@/lib/utils";
import { cn } from "@/lib/utils";

type DetailTab = "chart" | "monthly" | "reviews" | "news" | "sysreq" | "metadata";

// ─── Helper: strip HTML tags from Steam descriptions ──────────────────────────
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ─── Helper: format unix timestamp ───────────────────────────────────────────
function formatUnix(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ─── Review score color helper ────────────────────────────────────────────────
function reviewScoreColor(pct: number): string {
  if (pct >= 80) return "text-[oklch(0.72_0.2_145)]";
  if (pct >= 60) return "text-[oklch(0.78_0.18_75)]";
  return "text-[oklch(0.65_0.22_25)]";
}

// ─── System Requirements Panel ───────────────────────────────────────────────
function SysReqPanel({ title, reqs }: { title: string; reqs: { minimum: string; recommended: string } | null }) {
  if (!reqs || (!reqs.minimum && !reqs.recommended)) {
    return (
      <div className="rounded-lg border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-4">
        <h4 className="font-display text-sm font-bold text-[oklch(0.55_0.02_260)] mb-2">{title}</h4>
        <p className="text-xs text-[oklch(0.38_0.02_260)]">Not available</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-4 space-y-4">
      <h4 className="font-display text-sm font-bold text-white flex items-center gap-2">
        {title === "Windows" ? <Monitor className="w-4 h-4 text-[oklch(0.62_0.22_250)]" /> :
         title === "macOS" ? <Apple className="w-4 h-4 text-[oklch(0.62_0.22_250)]" /> :
         <Globe className="w-4 h-4 text-[oklch(0.62_0.22_250)]" />}
        {title}
      </h4>
      {reqs.minimum && (
        <div>
          <p className="text-xs font-semibold text-[oklch(0.78_0.18_75)] uppercase tracking-wide mb-1.5">Minimum</p>
          <p className="text-xs text-[oklch(0.55_0.02_260)] leading-relaxed whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: reqs.minimum.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "") }} />
        </div>
      )}
      {reqs.recommended && (
        <div>
          <p className="text-xs font-semibold text-[oklch(0.72_0.2_145)] uppercase tracking-wide mb-1.5">Recommended</p>
          <p className="text-xs text-[oklch(0.55_0.02_260)] leading-relaxed whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: reqs.recommended.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "") }} />
        </div>
      )}
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
function TabBtn({ id, active, icon: Icon, label, onClick }: {
  id: string; active: boolean; icon: React.ElementType; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap",
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
      )}
    >
      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(" ")[0]}</span>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GameDetail() {
  const params = useParams<{ appid: string }>();
  const appid = parseInt(params.appid ?? "0", 10);
  const [activeTab, setActiveTab] = useState<DetailTab>("chart");
  const [expandDesc, setExpandDesc] = useState(false);

  const { data: game, isLoading: gameLoading, refetch: refetchGame } = trpc.games.getGameDetail.useQuery({ appid });
  const { data: topGames } = trpc.games.getTrending.useQuery({ limit: 6 });
  const { data: newsData, isLoading: newsLoading } = trpc.games.getGameNews.useQuery(
    { appid, count: 10 },
    { enabled: activeTab === "news", staleTime: 10 * 60 * 1000 }
  );
  const { data: metadata, isLoading: metaLoading } = trpc.games.getFullMetadata.useQuery(
    { appid },
    { enabled: activeTab === "sysreq" || activeTab === "metadata", staleTime: 30 * 60 * 1000 }
  );
  const triggerUpdate = trpc.games.triggerUpdate.useMutation();

  const handleUpdateData = () => {
    triggerUpdate.mutate({ appid }, {
      onSuccess: () => setTimeout(() => refetchGame(), 3000),
    });
  };

  if (!gameLoading && !game) {
    return (
      <div className="container py-20 text-center">
        <Gamepad2 className="w-16 h-16 text-[oklch(0.3_0.02_260)] mx-auto mb-4" />
        <h2 className="font-display text-2xl text-white mb-2">Game Not Found</h2>
        <p className="text-[oklch(0.5_0.02_260)] mb-6">This game isn't in our database yet.</p>
        <Button asChild><Link href="/charts">← Back to Charts</Link></Button>
      </div>
    );
  }

  const positivePercent = game ? getPositivePercent(game.positiveReviews ?? 0, game.totalReviews ?? 0) : 0;
  const negativeReviews = (game?.totalReviews ?? 0) - (game?.positiveReviews ?? 0);
  const tags = Array.isArray(game?.tags) ? game.tags as string[] : [];
  const genres = game?.genre?.split(", ").filter(Boolean) ?? [];
  const screenshots = Array.isArray(game?.screenshots) ? game.screenshots as string[] : [];
  const platforms = game?.platforms as { windows?: boolean; mac?: boolean; linux?: boolean } | null;

  return (
    <>
      <SEOHead
        title={game ? `${game.name} — Player Stats, Reviews & Analytics` : "Game Analytics"}
        description={game ? `Live player count, historical charts, user reviews, news, and system requirements for ${game.name} on Steam. Currently ${formatNumber(game.ccu)} players online.` : ""}
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
          "aggregateRating": game.totalReviews ? {
            "@type": "AggregateRating",
            "ratingValue": positivePercent,
            "bestRating": 100,
            "ratingCount": game.totalReviews,
          } : undefined,
        } : undefined}
      />
      <div className="page-enter">
        {/* ── Hero Banner ─────────────────────────────────────────────────── */}
        <div className="relative">
          {(game?.background || game?.headerImage) && (
            <div className="absolute inset-0 h-72 overflow-hidden">
              <img src={game.background || game.headerImage || ""} alt="" className="w-full h-full object-cover opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[oklch(0.08_0.01_260)]" />
              <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.08_0.01_260/0.6)] to-transparent" />
            </div>
          )}

          <div className="container relative z-10 pt-8 pb-6">
            <Button asChild variant="ghost" size="sm" className="mb-6 text-[oklch(0.55_0.02_260)] hover:text-white">
              <Link href="/charts"><ChevronLeft className="w-4 h-4 mr-1" />Back to Charts</Link>
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
                        <Calendar className="w-3.5 h-3.5" />{formatDate(game.releaseDate)}
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
                      <span className="font-display text-2xl font-bold text-[oklch(0.62_0.22_250)] tabular-nums">{formatCommas(game.ccu)}</span>
                      <span className="text-sm text-[oklch(0.55_0.02_260)]">playing now</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {genres.slice(0, 4).map((g) => (
                      <Link key={g} href={`/genres?g=${encodeURIComponent(g)}`}>
                        <span className="px-2.5 py-1 rounded-md text-xs bg-[oklch(0.62_0.22_250/0.1)] text-[oklch(0.62_0.22_250)] border border-[oklch(0.62_0.22_250/0.2)] hover:bg-[oklch(0.62_0.22_250/0.2)] transition-colors cursor-pointer">{g}</span>
                      </Link>
                    ))}
                    <a href={getSteamStoreUrl(appid)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-[oklch(0.16_0.02_260)] text-[oklch(0.55_0.02_260)] border border-[oklch(0.22_0.015_260)] hover:text-white hover:border-[oklch(0.35_0.02_260)] transition-colors">
                      <ExternalLink className="w-3 h-3" />Steam Store
                    </a>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="container py-6">
          {/* ── Stats Grid ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

          {/* ── Review Summary Bar ──────────────────────────────────────────── */}
          {!gameLoading && game && (game.totalReviews ?? 0) > 0 && (
            <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-5 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={cn("font-display text-xl font-bold", reviewScoreColor(positivePercent))}>
                      {game.reviewScoreDesc || "Mixed"}
                    </span>
                    <span className="text-sm text-[oklch(0.45_0.02_260)]">
                      ({formatCommas(game.totalReviews)} total reviews)
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="relative h-3 rounded-full bg-[oklch(0.16_0.02_260)] overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-[oklch(0.72_0.2_145)] transition-all duration-700"
                      style={{ width: `${positivePercent}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-6 shrink-0">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-[oklch(0.72_0.2_145)]" />
                    <div>
                      <p className="text-sm font-bold text-[oklch(0.72_0.2_145)] tabular-nums">{formatCommas(game.positiveReviews)}</p>
                      <p className="text-xs text-[oklch(0.42_0.02_260)]">Positive</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4 text-[oklch(0.65_0.22_25)]" />
                    <div>
                      <p className="text-sm font-bold text-[oklch(0.65_0.22_25)] tabular-nums">{formatCommas(negativeReviews)}</p>
                      <p className="text-xs text-[oklch(0.42_0.02_260)]">Negative</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <AdZone size="leaderboard" className="mb-6" />

          {/* ── Data Tabs ────────────────────────────────────────────────────── */}
          <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-4 sm:p-6 mb-8">
            {/* Tab Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex flex-wrap gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700/40">
                <TabBtn id="chart" active={activeTab === "chart"} icon={BarChart2} label="Player Chart" onClick={() => setActiveTab("chart")} />
                <TabBtn id="monthly" active={activeTab === "monthly"} icon={Table2} label="Monthly Stats" onClick={() => setActiveTab("monthly")} />
                <TabBtn id="reviews" active={activeTab === "reviews"} icon={MessageSquare} label="User Reviews" onClick={() => setActiveTab("reviews")} />
                <TabBtn id="news" active={activeTab === "news"} icon={Newspaper} label="News" onClick={() => setActiveTab("news")} />
                <TabBtn id="sysreq" active={activeTab === "sysreq"} icon={Cpu} label="System Req." onClick={() => setActiveTab("sysreq")} />
                <TabBtn id="metadata" active={activeTab === "metadata"} icon={Info} label="Metadata" onClick={() => setActiveTab("metadata")} />
              </div>
              <Button
                variant="outline" size="sm"
                onClick={handleUpdateData}
                disabled={triggerUpdate.isPending}
                className="flex items-center gap-2 border-slate-600 text-slate-300 hover:text-white hover:border-indigo-500 bg-transparent shrink-0"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", triggerUpdate.isPending && "animate-spin")} />
                {triggerUpdate.isPending ? "Updating..." : "Update Data"}
              </Button>
            </div>

            {/* ── Tab: Player Chart ── */}
            {activeTab === "chart" && (
              <HighchartsPlayerChart
                appid={appid}
                gameName={game?.name ?? ""}
                currentPlayers={game?.ccu ?? 0}
                peakPlayers={game?.peakPlayersAllTime ?? 0}
              />
            )}

            {/* ── Tab: Monthly Stats ── */}
            {activeTab === "monthly" && <MonthlyStatsTable appid={appid} />}

            {/* ── Tab: User Reviews ── */}
            {activeTab === "reviews" && (
              <SteamReviews
                appid={appid}
                reviewScore={game?.reviewScore ?? 0}
                reviewScoreDesc={game?.reviewScoreDesc ?? ""}
                totalReviews={game?.totalReviews ?? 0}
                positiveReviews={game?.positiveReviews ?? 0}
              />
            )}

            {/* ── Tab: News ── */}
            {activeTab === "news" && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <Newspaper className="w-5 h-5 text-[oklch(0.62_0.22_250)]" />
                  <h3 className="font-display text-lg font-bold text-white">Recent News</h3>
                  <span className="text-xs text-[oklch(0.42_0.02_260)] ml-1">via Steam News API</span>
                </div>
                {newsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="rounded-lg border border-[oklch(0.18_0.015_260)] p-4 space-y-2">
                        <div className="shimmer h-4 w-3/4 rounded" />
                        <div className="shimmer h-3 w-1/3 rounded" />
                        <div className="shimmer h-3 w-full rounded" />
                        <div className="shimmer h-3 w-5/6 rounded" />
                      </div>
                    ))}
                  </div>
                ) : !newsData || newsData.length === 0 ? (
                  <div className="text-center py-12">
                    <Newspaper className="w-12 h-12 text-[oklch(0.3_0.02_260)] mx-auto mb-3" />
                    <p className="text-[oklch(0.45_0.02_260)]">No recent news available for this game.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {newsData.map((item) => (
                      <a
                        key={item.gid}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg border border-[oklch(0.18_0.015_260)] bg-[oklch(0.09_0.01_260)] p-4 hover:border-[oklch(0.62_0.22_250/0.4)] hover:bg-[oklch(0.11_0.015_260)] transition-all group"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="text-sm font-semibold text-white group-hover:text-[oklch(0.62_0.22_250)] transition-colors leading-snug">
                            {item.title}
                          </h4>
                          <ExternalLink className="w-3.5 h-3.5 text-[oklch(0.42_0.02_260)] shrink-0 mt-0.5" />
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs text-[oklch(0.42_0.02_260)]">{formatUnix(item.date)}</span>
                          {item.author && <span className="text-xs text-[oklch(0.38_0.02_260)]">by {item.author}</span>}
                          {item.feedLabel && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-[oklch(0.62_0.22_250/0.1)] text-[oklch(0.62_0.22_250)] border border-[oklch(0.62_0.22_250/0.2)]">
                              {item.feedLabel}
                            </span>
                          )}
                        </div>
                        {item.contents && (
                          <p className="text-xs text-[oklch(0.5_0.02_260)] leading-relaxed line-clamp-3">
                            {stripHtml(item.contents).slice(0, 300)}…
                          </p>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: System Requirements ── */}
            {activeTab === "sysreq" && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <Cpu className="w-5 h-5 text-[oklch(0.62_0.22_250)]" />
                  <h3 className="font-display text-lg font-bold text-white">System Requirements</h3>
                  <span className="text-xs text-[oklch(0.42_0.02_260)] ml-1">via Steam Store API</span>
                </div>
                {metaLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="rounded-lg border border-[oklch(0.18_0.015_260)] p-4 space-y-3">
                        <div className="shimmer h-4 w-24 rounded" />
                        <div className="shimmer h-3 w-full rounded" />
                        <div className="shimmer h-3 w-5/6 rounded" />
                        <div className="shimmer h-3 w-4/6 rounded" />
                      </div>
                    ))}
                  </div>
                ) : !metadata ? (
                  <div className="text-center py-12">
                    <Cpu className="w-12 h-12 text-[oklch(0.3_0.02_260)] mx-auto mb-3" />
                    <p className="text-[oklch(0.45_0.02_260)]">System requirements not available.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SysReqPanel title="Windows" reqs={metadata.pcRequirements} />
                    <SysReqPanel title="macOS" reqs={metadata.macRequirements} />
                    <SysReqPanel title="Linux" reqs={metadata.linuxRequirements} />
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Full Metadata ── */}
            {activeTab === "metadata" && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <Info className="w-5 h-5 text-[oklch(0.62_0.22_250)]" />
                  <h3 className="font-display text-lg font-bold text-white">Full Game Metadata</h3>
                  <span className="text-xs text-[oklch(0.42_0.02_260)] ml-1">via Steam Store API</span>
                </div>
                {metaLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="rounded-lg border border-[oklch(0.18_0.015_260)] p-4 space-y-2">
                        <div className="shimmer h-3 w-24 rounded" />
                        <div className="shimmer h-4 w-3/4 rounded" />
                      </div>
                    ))}
                  </div>
                ) : !metadata ? (
                  <div className="text-center py-12">
                    <Info className="w-12 h-12 text-[oklch(0.3_0.02_260)] mx-auto mb-3" />
                    <p className="text-[oklch(0.45_0.02_260)]">Metadata not available.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Key metadata grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {[
                        { label: "Age Rating", value: metadata.ageRating === "0" || !metadata.ageRating ? "All Ages" : `${metadata.ageRating}+`, icon: Shield },
                        { label: "Achievements", value: metadata.achievementsTotal > 0 ? `${metadata.achievementsTotal} achievements` : "None", icon: Award },
                        { label: "DLC Available", value: metadata.dlcCount > 0 ? `${metadata.dlcCount} DLC packs` : "No DLC", icon: Package },
                        { label: "Metacritic", value: metadata.metacriticScore ? String(metadata.metacriticScore) : "N/A", icon: Star },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="rounded-lg border border-[oklch(0.18_0.015_260)] bg-[oklch(0.09_0.01_260)] p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-3.5 h-3.5 text-[oklch(0.62_0.22_250)]" />
                            <span className="text-xs text-[oklch(0.42_0.02_260)] uppercase tracking-wide font-mono">{label}</span>
                          </div>
                          <p className="text-sm font-semibold text-white">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Categories */}
                    {metadata.categories && metadata.categories.length > 0 && (
                      <div className="rounded-lg border border-[oklch(0.18_0.015_260)] bg-[oklch(0.09_0.01_260)] p-4">
                        <h4 className="text-xs text-[oklch(0.42_0.02_260)] uppercase tracking-wide font-mono mb-3 flex items-center gap-2">
                          <Gamepad2 className="w-3.5 h-3.5" />Features & Categories
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {metadata.categories.map((cat) => (
                            <span key={cat.id} className="px-2.5 py-1 rounded-md text-xs bg-[oklch(0.62_0.22_250/0.08)] text-[oklch(0.62_0.22_250)] border border-[oklch(0.62_0.22_250/0.15)]">
                              {cat.description}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Supported Languages */}
                    {metadata.supportedLanguages && (
                      <div className="rounded-lg border border-[oklch(0.18_0.015_260)] bg-[oklch(0.09_0.01_260)] p-4">
                        <h4 className="text-xs text-[oklch(0.42_0.02_260)] uppercase tracking-wide font-mono mb-2 flex items-center gap-2">
                          <Languages className="w-3.5 h-3.5" />Supported Languages
                        </h4>
                        <p className="text-xs text-[oklch(0.55_0.02_260)] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: metadata.supportedLanguages }} />
                      </div>
                    )}

                    {/* Genres */}
                    {metadata.genres && metadata.genres.length > 0 && (
                      <div className="rounded-lg border border-[oklch(0.18_0.015_260)] bg-[oklch(0.09_0.01_260)] p-4">
                        <h4 className="text-xs text-[oklch(0.42_0.02_260)] uppercase tracking-wide font-mono mb-3 flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5" />Genres
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {metadata.genres.map((g) => (
                            <Link key={g.id} href={`/genres?g=${encodeURIComponent(g.description)}`}>
                              <span className="px-2.5 py-1 rounded-md text-xs bg-[oklch(0.72_0.2_145/0.08)] text-[oklch(0.72_0.2_145)] border border-[oklch(0.72_0.2_145/0.2)] hover:bg-[oklch(0.72_0.2_145/0.15)] transition-colors cursor-pointer">
                                {g.description}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Support & Legal */}
                    {(metadata.supportEmail || metadata.supportUrl || metadata.website || metadata.legalNotice) && (
                      <div className="rounded-lg border border-[oklch(0.18_0.015_260)] bg-[oklch(0.09_0.01_260)] p-4">
                        <h4 className="text-xs text-[oklch(0.42_0.02_260)] uppercase tracking-wide font-mono mb-3 flex items-center gap-2">
                          <Headphones className="w-3.5 h-3.5" />Support & Legal
                        </h4>
                        <div className="space-y-2 text-xs text-[oklch(0.55_0.02_260)]">
                          {metadata.website && (
                            <p>Website: <a href={metadata.website} target="_blank" rel="noopener noreferrer" className="text-[oklch(0.62_0.22_250)] hover:underline">{metadata.website}</a></p>
                          )}
                          {metadata.supportUrl && (
                            <p>Support: <a href={metadata.supportUrl} target="_blank" rel="noopener noreferrer" className="text-[oklch(0.62_0.22_250)] hover:underline">{metadata.supportUrl}</a></p>
                          )}
                          {metadata.supportEmail && <p>Email: {metadata.supportEmail}</p>}
                          {metadata.metacriticUrl && (
                            <p>Metacritic: <a href={metadata.metacriticUrl} target="_blank" rel="noopener noreferrer" className="text-[oklch(0.62_0.22_250)] hover:underline">View on Metacritic</a></p>
                          )}
                          {metadata.legalNotice && (
                            <p className="text-[oklch(0.38_0.02_260)] mt-2 leading-relaxed">{stripHtml(metadata.legalNotice)}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Content Descriptors */}
                    {metadata.contentDescriptors && metadata.contentDescriptors.length > 0 && (
                      <div className="rounded-lg border border-[oklch(0.22_0.02_30/0.3)] bg-[oklch(0.12_0.01_30/0.2)] p-4">
                        <h4 className="text-xs text-[oklch(0.65_0.22_25)] uppercase tracking-wide font-mono mb-2 flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5" />Content Descriptors
                        </h4>
                        {metadata.contentDescriptors.map((d, i) => (
                          <p key={i} className="text-xs text-[oklch(0.55_0.02_260)]">{d}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Bottom Content Grid ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* About / Description */}
              {game?.shortDescription && (
                <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-6">
                  <h3 className="font-display text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[oklch(0.62_0.22_250)]" />About
                  </h3>
                  <p className="text-sm text-[oklch(0.6_0.02_260)] leading-relaxed">{game.shortDescription}</p>
                </div>
              )}

              {/* Game Statistics */}
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
                    { label: "Negative Reviews", value: negativeReviews > 0 ? formatCommas(negativeReviews) : "—", color: "text-[oklch(0.65_0.22_25)]" },
                    { label: "Metacritic Score", value: game?.metacriticScore ? String(game.metacriticScore) : "—", color: "text-[oklch(0.62_0.22_250)]" },
                    { label: "Developer", value: game?.developer || "—", color: "text-white" },
                    { label: "Publisher", value: game?.publisher || "—", color: "text-white" },
                    { label: "Release Date", value: game?.releaseDate ? formatDate(game.releaseDate) : "—", color: "text-white" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-xs text-[oklch(0.42_0.02_260)] uppercase tracking-wide font-mono">{label}</span>
                      <span className={cn("text-sm font-semibold tabular-nums truncate", color)}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Screenshots */}
              {screenshots.length > 0 && (
                <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-6">
                  <h3 className="font-display text-lg font-bold text-white mb-4">Screenshots</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {screenshots.slice(0, 8).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Screenshot ${i + 1}`}
                          className="w-full aspect-video object-cover rounded-lg hover:opacity-80 transition-opacity"
                          loading="lazy" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Sidebar ── */}
            <div className="space-y-4">
              {/* Purchase */}
              <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-5">
                <h3 className="font-display text-base font-bold text-white mb-4">Purchase</h3>
                <div className="mb-4">
                  {game?.isFree ? (
                    <p className="text-2xl font-display font-bold text-[oklch(0.72_0.2_145)]">Free to Play</p>
                  ) : game?.priceUsd != null ? (
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-display font-bold text-white">{formatPrice(game.priceUsd)}</p>
                      {game.discountPercent && game.discountPercent > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[oklch(0.72_0.2_145)] text-white text-xs font-bold">-{game.discountPercent}%</span>
                      )}
                    </div>
                  ) : null}
                </div>
                <a href={getSteamStoreUrl(appid)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[oklch(0.62_0.22_250)] hover:bg-[oklch(0.68_0.22_250)] text-white text-sm font-semibold transition-colors">
                  <ExternalLink className="w-4 h-4" />View on Steam
                </a>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-5">
                  <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[oklch(0.5_0.02_260)]" />Tags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(expandDesc ? tags : tags.slice(0, 12)).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded text-xs bg-[oklch(0.16_0.02_260)] text-[oklch(0.5_0.02_260)] border border-[oklch(0.22_0.015_260)]">{tag}</span>
                    ))}
                    {tags.length > 12 && (
                      <button onClick={() => setExpandDesc(!expandDesc)}
                        className="px-2 py-0.5 rounded text-xs text-[oklch(0.62_0.22_250)] flex items-center gap-1 hover:text-white transition-colors">
                        {expandDesc ? <><ChevronUp className="w-3 h-3" />Less</> : <><ChevronDown className="w-3 h-3" />+{tags.length - 12} more</>}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <AdZone size="rectangle" />

              {/* Related games */}
              <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-5">
                <h3 className="font-display text-base font-bold text-white mb-3 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[oklch(0.5_0.02_260)]" />Top Games
                </h3>
                <div className="space-y-2">
                  {(topGames ?? []).filter((g) => g.appid !== appid).slice(0, 5).map((g, i) => (
                    <Link key={g.appid} href={`/game/${g.appid}`}>
                      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-[oklch(0.14_0.015_260)] transition-colors cursor-pointer">
                        <span className="rank-badge text-[oklch(0.42_0.02_260)] w-4 shrink-0">{i + 1}</span>
                        <img src={g.headerImage ?? getHeaderImage(g.appid)} alt={g.name}
                          className="w-12 h-7 rounded object-cover shrink-0" loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = getHeaderImage(g.appid); }} />
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

          <AdZone size="leaderboard" className="mt-8" />
        </div>
      </div>
    </>
  );
}
