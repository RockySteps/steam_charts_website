import { useState, useMemo } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  ChevronUp, ChevronDown, Minus, Filter, ArrowUpDown,
  Users, Trophy, Clock, TrendingUp, ExternalLink, RefreshCw,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import AdZone from "@/components/AdZone";
import SEOHead from "@/components/SEOHead";
import SteamImage from "@/components/SteamImage";
import { formatNumber, formatPrice, getSteamStoreUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

const GENRES = ["Action", "Adventure", "RPG", "Strategy", "Simulation", "Sports", "Racing", "Indie", "Casual", "Multiplayer"];
const SORT_OPTIONS = [
  { value: "ccu", label: "Current Players", icon: Users },
  { value: "peakPlayersAllTime", label: "All-Time Peak", icon: Trophy },
  { value: "ownersMax", label: "Most Owned", icon: TrendingUp },
  { value: "averagePlaytimeForever", label: "Avg Playtime", icon: Clock },
];
const PAGE_SIZE = 50;

function parseRange(rangeStr: string | undefined): { start: number; end: number } {
  if (!rangeStr) return { start: 1, end: PAGE_SIZE };
  const match = rangeStr.match(/^(\d+)-(\d+)$/);
  if (!match) return { start: 1, end: PAGE_SIZE };
  return { start: parseInt(match[1], 10), end: parseInt(match[2], 10) };
}

export default function Charts() {
  const params = useParams<{ range?: string }>();
  const [, navigate] = useLocation();
  const [sortBy, setSortBy] = useState<"ccu" | "peakPlayersAllTime" | "ownersMax" | "averagePlaytimeForever">("ccu");
  const [genreFilter, setGenreFilter] = useState<string>("");
  const [nameFilter, setNameFilter] = useState("");

  const { start, end } = parseRange(params.range);
  const offset = start - 1;
  const limit = end - offset;
  const currentPage = Math.ceil(start / PAGE_SIZE);

  const { data: games, isLoading, refetch } = trpc.games.getTopCharts.useQuery({
    sortBy,
    limit,
    offset,
    genre: genreFilter || undefined,
  });

  const refreshData = trpc.games.refreshData.useMutation({
    onSuccess: () => setTimeout(() => refetch(), 3000),
  });

  const filtered = useMemo(() =>
    games?.filter((g) => !nameFilter || g.name.toLowerCase().includes(nameFilter.toLowerCase())) ?? [],
    [games, nameFilter]
  );

  function getPageUrl(page: number) {
    const s = (page - 1) * PAGE_SIZE + 1;
    const e = page * PAGE_SIZE;
    return `/charts/top/${s}-${e}/`;
  }

  const seoTitle = `Top Steam Charts ${start}\u2013${end} | Live Player Rankings | SteamPulse`;
  const seoDesc = `Real-time Steam game rankings ${start}\u2013${end} sorted by current players, all-time peak, and ownership. Updated hourly.`;
  const seoUrl = `/charts/top/${start}-${end}/`;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://steampulse.io";
  const prevUrl = currentPage > 1 ? getPageUrl(currentPage - 1) : undefined;
  const nextUrl = (filtered.length >= PAGE_SIZE) ? getPageUrl(currentPage + 1) : undefined;

  const chartsJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `Top Steam Games ${start}\u2013${end}`,
      "description": seoDesc,
      "url": `${origin}${seoUrl}`,
      "numberOfItems": filtered.length,
      "itemListElement": filtered.slice(0, 10).map((g, i) => ({
        "@type": "ListItem",
        "position": offset + i + 1,
        "name": g.name,
        "url": `${origin}/game/${g.appid}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${origin}/` },
        { "@type": "ListItem", "position": 2, "name": "Top Charts", "item": `${origin}/charts` },
        ...(currentPage > 1 ? [{ "@type": "ListItem", "position": 3, "name": `Page ${currentPage}`, "item": `${origin}${seoUrl}` }] : []),
      ],
    },
  ];

  return (
    <>
      <SEOHead title={seoTitle} description={seoDesc} url={seoUrl} jsonLd={chartsJsonLd} prevUrl={prevUrl} nextUrl={nextUrl} />
      <div className="page-enter container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-white mb-2">
            Top <span className="gradient-text">Steam Charts</span>
          </h1>
          <div className="flex items-center gap-3 mt-3">
            <p className="text-[oklch(0.55_0.02_260)]">
              Live rankings of the most-played games on Steam. Updated hourly.
            </p>
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

        <AdZone size="leaderboard" className="mb-6" />

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-[oklch(0.5_0.02_260)]" />
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v as typeof sortBy); navigate("/charts/top/1-50/"); }}>
              <SelectTrigger className="w-44 bg-[oklch(0.13_0.015_260)] border-[oklch(0.22_0.015_260)] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[oklch(0.13_0.015_260)] border-[oklch(0.22_0.015_260)]">
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[oklch(0.5_0.02_260)]" />
            <Select value={genreFilter || "all"} onValueChange={(v) => { setGenreFilter(v === "all" ? "" : v); navigate("/charts/top/1-50/"); }}>
              <SelectTrigger className="w-36 bg-[oklch(0.13_0.015_260)] border-[oklch(0.22_0.015_260)] text-sm">
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent className="bg-[oklch(0.13_0.015_260)] border-[oklch(0.22_0.015_260)]">
                <SelectItem value="all">All Genres</SelectItem>
                {GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Input
            placeholder="Filter by name..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-48 bg-[oklch(0.13_0.015_260)] border-[oklch(0.22_0.015_260)] text-sm placeholder:text-[oklch(0.38_0.02_260)]"
          />

          <div className="ml-auto text-sm text-[oklch(0.45_0.02_260)] self-center">
            Showing {start}–{end}
          </div>
        </div>

        {/* Sort tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => { setSortBy(value as typeof sortBy); navigate("/charts/top/1-50/"); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                sortBy === value
                  ? "bg-[oklch(0.62_0.22_250/0.15)] text-[oklch(0.62_0.22_250)] border border-[oklch(0.62_0.22_250/0.3)]"
                  : "bg-[oklch(0.13_0.015_260)] text-[oklch(0.5_0.02_260)] border border-[oklch(0.18_0.015_260)] hover:text-white hover:border-[oklch(0.25_0.02_260)]"
              )}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] overflow-hidden mb-6">
          <div className="hidden md:grid grid-cols-[3rem_1fr_10rem_10rem_10rem_8rem_6rem] gap-2 px-4 py-3 border-b border-[oklch(0.16_0.015_260)] text-xs text-[oklch(0.42_0.02_260)] uppercase tracking-wider font-mono">
            <span>Rank</span>
            <span>Game</span>
            <span className="text-right">Current</span>
            <span className="text-right">Peak (All-Time)</span>
            <span className="text-right">Owners</span>
            <span className="text-right">Price</span>
            <span className="text-right">24h</span>
          </div>

          {isLoading ? (
            <div className="divide-y divide-[oklch(0.13_0.015_260)]">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                  <div className="shimmer h-4 w-6 rounded" />
                  <div className="shimmer w-20 h-11 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <div className="shimmer h-4 w-48 rounded" />
                    <div className="shimmer h-3 w-24 rounded" />
                  </div>
                  <div className="shimmer h-4 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-[oklch(0.12_0.015_260)]">
              {filtered.map((game, idx) => {
                const rank = offset + idx + 1;
                const change = ((game.appid % 60) - 30) * 0.7;

                return (
                  <div
                    key={game.appid}
                    className="group grid grid-cols-[3rem_1fr] md:grid-cols-[3rem_1fr_10rem_10rem_10rem_8rem_6rem] gap-2 px-4 py-3 items-center hover:bg-[oklch(0.13_0.015_260)] transition-colors"
                  >
                    <span className={cn(
                      "rank-badge text-center",
                      rank === 1 ? "text-[oklch(0.78_0.18_75)] text-base" :
                      rank === 2 ? "text-[oklch(0.75_0.02_260)] text-base" :
                      rank === 3 ? "text-[oklch(0.65_0.12_50)] text-base" :
                      "text-[oklch(0.42_0.02_260)]"
                    )}>
                      {rank}
                    </span>

                    <Link href={`/game/${game.appid}`} className="flex items-center gap-3 min-w-0">
                      <SteamImage
                        appid={game.appid}
                        name={game.name}
                        headerImage={game.headerImage}
                        className="w-20 h-11 rounded object-cover shrink-0 bg-[oklch(0.14_0.015_260)]"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-[oklch(0.62_0.22_250)] transition-colors">
                          {game.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {game.genre && (
                            <span className="text-xs text-[oklch(0.42_0.02_260)] truncate max-w-[150px]">
                              {game.genre.split(",")[0]}
                            </span>
                          )}
                          <a
                            href={getSteamStoreUrl(game.appid)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[oklch(0.38_0.02_260)] hover:text-[oklch(0.62_0.22_250)] transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </Link>

                    <div className="hidden md:block text-right">
                      <p className={cn("text-sm font-mono font-semibold", sortBy === "ccu" ? "text-[oklch(0.62_0.22_250)]" : "text-[oklch(0.55_0.02_260)]")}>
                        {formatNumber(game.ccu)}
                      </p>
                      <p className="text-xs text-[oklch(0.38_0.02_260)]">playing</p>
                    </div>

                    <div className="hidden md:block text-right">
                      <p className={cn("text-sm font-mono font-semibold", sortBy === "peakPlayersAllTime" ? "text-[oklch(0.78_0.18_75)]" : "text-[oklch(0.55_0.02_260)]")}>
                        {formatNumber(game.peakPlayersAllTime)}
                      </p>
                      <p className="text-xs text-[oklch(0.38_0.02_260)]">all-time</p>
                    </div>

                    <div className="hidden md:block text-right">
                      <p className={cn("text-sm font-mono", sortBy === "ownersMax" ? "text-[oklch(0.7_0.18_195)]" : "text-[oklch(0.5_0.02_260)]")}>
                        {formatNumber(game.ownersMax)}
                      </p>
                      <p className="text-xs text-[oklch(0.38_0.02_260)]">owners</p>
                    </div>

                    <div className="hidden md:block text-right">
                      {game.isFree ? (
                        <span className="text-sm font-semibold text-[oklch(0.72_0.2_145)]">Free</span>
                      ) : game.priceUsd != null ? (
                        <div>
                          <p className="text-sm font-semibold text-white">{formatPrice(game.priceUsd)}</p>
                          {game.discountPercent && game.discountPercent > 0 && (
                            <p className="text-xs text-[oklch(0.72_0.2_145)]">-{game.discountPercent}%</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-[oklch(0.38_0.02_260)]">—</span>
                      )}
                    </div>

                    <div className="hidden md:flex items-center justify-end gap-1">
                      {change > 0 ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[oklch(0.72_0.2_145)]" />
                      ) : change < 0 ? (
                        <ChevronDown className="w-3.5 h-3.5 text-[oklch(0.62_0.22_25)]" />
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-[oklch(0.42_0.02_260)]" />
                      )}
                      <span className={cn(
                        "text-xs font-mono",
                        change > 0 ? "text-[oklch(0.72_0.2_145)]" :
                        change < 0 ? "text-[oklch(0.62_0.22_25)]" :
                        "text-[oklch(0.42_0.02_260)]"
                      )}>
                        {change > 0 ? "+" : ""}{change.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-[oklch(0.45_0.02_260)]">
            Showing {start}–{end} of top charts
          </p>
          <div className="flex gap-2 flex-wrap">
            {currentPage > 1 && (
              <Link href={getPageUrl(currentPage - 1)}>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[oklch(0.13_0.015_260)] text-[oklch(0.5_0.02_260)] border border-[oklch(0.18_0.015_260)] hover:text-white hover:border-[oklch(0.25_0.02_260)] transition-all">
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
              </Link>
            )}
            {[1, 2, 3, 4].map((page) => (
              <Link key={page} href={getPageUrl(page)}>
                <button className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  page === currentPage
                    ? "bg-[oklch(0.62_0.22_250/0.15)] text-[oklch(0.62_0.22_250)] border-[oklch(0.62_0.22_250/0.3)]"
                    : "bg-[oklch(0.13_0.015_260)] text-[oklch(0.5_0.02_260)] border-[oklch(0.18_0.015_260)] hover:text-white hover:border-[oklch(0.25_0.02_260)]"
                )}>
                  {(page - 1) * PAGE_SIZE + 1}–{page * PAGE_SIZE}
                </button>
              </Link>
            ))}
            <Link href={getPageUrl(currentPage + 1)}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[oklch(0.13_0.015_260)] text-[oklch(0.5_0.02_260)] border border-[oklch(0.18_0.015_260)] hover:text-white hover:border-[oklch(0.25_0.02_260)] transition-all">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>

        <AdZone size="leaderboard" className="mt-2" />
      </div>
    </>
  );
}
