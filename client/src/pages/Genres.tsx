import { useEffect, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Layers, Users, Trophy, ChevronRight, ChevronLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import AdZone from "@/components/AdZone";
import SEOHead from "@/components/SEOHead";
import SteamImage from "@/components/SteamImage";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ALL_GENRES = [
  "Action", "Adventure", "RPG", "Strategy", "Simulation",
  "Sports", "Racing", "Indie", "Casual", "Multiplayer",
  "Puzzle", "Horror", "Shooter", "Platformer", "Survival",
];

const GENRE_COLORS: Record<string, string> = {
  Action: "oklch(0.62 0.22 25)",
  Adventure: "oklch(0.7 0.18 195)",
  RPG: "oklch(0.62 0.22 295)",
  Strategy: "oklch(0.62 0.22 250)",
  Simulation: "oklch(0.72 0.2 145)",
  Sports: "oklch(0.78 0.18 75)",
  Racing: "oklch(0.62 0.22 25)",
  Indie: "oklch(0.7 0.18 195)",
  Casual: "oklch(0.72 0.2 145)",
  Multiplayer: "oklch(0.62 0.22 250)",
  Puzzle: "oklch(0.78 0.18 75)",
  Horror: "oklch(0.62 0.22 25)",
  Shooter: "oklch(0.62 0.22 250)",
  Platformer: "oklch(0.72 0.2 145)",
  Survival: "oklch(0.78 0.18 75)",
};

const PAGE_SIZE = 50;

function parseRange(rangeStr: string | undefined): { start: number; end: number } {
  if (!rangeStr) return { start: 1, end: PAGE_SIZE };
  const match = rangeStr.match(/^(\d+)-(\d+)$/);
  if (!match) return { start: 1, end: PAGE_SIZE };
  return { start: parseInt(match[1], 10), end: parseInt(match[2], 10) };
}

export default function Genres() {
  const params = useParams<{ genre?: string; range?: string }>();
  const [, navigate] = useLocation();
  const listRef = useRef<HTMLDivElement>(null);

  const selectedGenre = params.genre ?? "";
  const { start, end } = parseRange(params.range);
  const offset = start - 1;
  const limit = end - offset;

  const { data: genreData, isLoading } = trpc.games.getByGenre.useQuery(
    { genre: selectedGenre, limit, offset },
    { enabled: !!selectedGenre }
  );

  const { data: allGamesData, isLoading: allLoading } = trpc.games.getTopCharts.useQuery(
    { sortBy: "ccu", limit, offset },
    { enabled: !selectedGenre }
  );

  const { data: genreStats } = trpc.games.getGenres.useQuery();

  const games = selectedGenre ? (genreData?.games ?? []) : (allGamesData ?? []);
  const total = selectedGenre ? (genreData?.total ?? 0) : undefined;
  const loading = selectedGenre ? isLoading : allLoading;

  const totalPages = total ? Math.ceil(total / PAGE_SIZE) : undefined;
  const currentPage = Math.ceil(start / PAGE_SIZE);

  function getPageUrl(page: number, genre: string) {
    const s = (page - 1) * PAGE_SIZE + 1;
    const e = page * PAGE_SIZE;
    const slug = genre.toLowerCase();
    return `/genres/${slug}/${s}-${e}/`;
  }

  function handleGenreClick(genre: string) {
    navigate(`/genres/${genre.toLowerCase()}/1-50/`);
  }

  // Scroll to game list when genre or page changes
  useEffect(() => {
    if (selectedGenre && listRef.current) {
      setTimeout(() => {
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedGenre, start]);

  const seoTitle = selectedGenre
    ? `${selectedGenre} Games on Steam | Page ${currentPage} | SteamPulse`
    : "Steam Genre Explorer | Browse Games by Category | SteamPulse";
  const seoDesc = selectedGenre
    ? `Browse the top ${selectedGenre} games on Steam ranked by current players. Page ${currentPage} of ${totalPages ?? "?"}.`
    : "Explore Steam games by genre. Find the most popular Action, RPG, Strategy, Simulation, and more games ranked by current players.";
  const seoUrl = selectedGenre
    ? `/genres/${selectedGenre.toLowerCase()}/${start}-${end}/`
    : "/genres";

  return (
    <>
      <SEOHead title={seoTitle} description={seoDesc} url={seoUrl} />
      <div className="page-enter container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-white mb-2">
            Genre <span className="gradient-text">Explorer</span>
          </h1>
          <p className="text-[oklch(0.55_0.02_260)]">Browse and rank games by category. Click a genre to filter.</p>
        </div>

        <AdZone size="leaderboard" className="mb-8" />

        {/* Genre grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
          <Link href="/genres">
            <div className={cn(
              "p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer",
              !selectedGenre
                ? "border-[oklch(0.62_0.22_250/0.5)] bg-[oklch(0.62_0.22_250/0.1)] text-[oklch(0.62_0.22_250)]"
                : "border-[oklch(0.18_0.015_260)] bg-[oklch(0.11_0.015_260)] text-[oklch(0.55_0.02_260)] hover:border-[oklch(0.28_0.02_260)] hover:text-white"
            )}>
              <Layers className="w-5 h-5 mb-2" />
              <p className="text-sm font-semibold">All Games</p>
              {genreStats && (
                <p className="text-xs opacity-70 mt-0.5">{genreStats.length} genres</p>
              )}
            </div>
          </Link>
          {ALL_GENRES.map((genre) => {
            const color = GENRE_COLORS[genre] ?? "oklch(0.62 0.22 250)";
            const isActive = selectedGenre.toLowerCase() === genre.toLowerCase();
            const stat = genreStats?.find((g: { genre: string }) => g.genre === genre);
            return (
              <button
                key={genre}
                onClick={() => handleGenreClick(genre)}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all duration-200",
                  isActive
                    ? "border-current/50 text-white"
                    : "border-[oklch(0.18_0.015_260)] bg-[oklch(0.11_0.015_260)] text-[oklch(0.55_0.02_260)] hover:border-[oklch(0.28_0.02_260)] hover:text-white"
                )}
                style={isActive ? {
                  background: `${color.replace(")", " / 0.1)")}`,
                  borderColor: `${color.replace(")", " / 0.4)")}`,
                  color,
                } : {}}
              >
                <div
                  className="w-5 h-5 rounded mb-2"
                  style={{ background: isActive ? color : "oklch(0.2 0.015 260)" }}
                />
                <p className="text-sm font-semibold">{genre}</p>
                {stat && (
                  <p className="text-xs opacity-70 mt-0.5">{stat.count} games</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Games list */}
        <div ref={listRef} className="mb-4 flex items-center justify-between scroll-mt-20">
          <h2 className="font-display text-xl font-bold text-white">
            {selectedGenre ? (
              <>
                <span style={{ color: GENRE_COLORS[selectedGenre] ?? "white" }}>{selectedGenre}</span> Games
                {total != null && <span className="text-sm font-normal text-[oklch(0.45_0.02_260)] ml-2">({total.toLocaleString()} total)</span>}
              </>
            ) : "All Top Games"}
          </h2>
          <span className="text-sm text-[oklch(0.45_0.02_260)]">
            Showing {start}–{Math.min(end, (total ?? end))} of {total?.toLocaleString() ?? games.length}
          </span>
        </div>

        <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] overflow-hidden mb-6">
          <div className="hidden md:grid grid-cols-[3rem_1fr_9rem_9rem] gap-3 px-4 py-3 border-b border-[oklch(0.16_0.015_260)] text-xs text-[oklch(0.42_0.02_260)] uppercase tracking-wider font-mono">
            <span>#</span>
            <span>Game</span>
            <span className="text-right">Players Now</span>
            <span className="text-right">Peak</span>
          </div>
          {loading ? (
            <div className="divide-y divide-[oklch(0.13_0.015_260)]">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="shimmer h-4 w-6 rounded" />
                  <div className="shimmer w-16 h-9 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <div className="shimmer h-4 w-40 rounded" />
                    <div className="shimmer h-3 w-24 rounded" />
                  </div>
                  <div className="shimmer h-4 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : games.length === 0 ? (
            <div className="py-16 text-center text-[oklch(0.45_0.02_260)]">
              No games found for this genre.
            </div>
          ) : (
            <div className="divide-y divide-[oklch(0.12_0.015_260)]">
              {games.map((game, idx) => (
                <Link key={game.appid} href={`/game/${game.appid}`}>
                  <div className="group grid grid-cols-[3rem_1fr] md:grid-cols-[3rem_1fr_9rem_9rem] gap-3 px-4 py-3 items-center hover:bg-[oklch(0.13_0.015_260)] transition-colors cursor-pointer">
                    <span className={cn(
                      "rank-badge text-center",
                      offset + idx === 0 ? "text-[oklch(0.78_0.18_75)]" :
                      offset + idx === 1 ? "text-[oklch(0.75_0.02_260)]" :
                      offset + idx === 2 ? "text-[oklch(0.65_0.12_50)]" :
                      "text-[oklch(0.42_0.02_260)]"
                    )}>
                      {offset + idx + 1}
                    </span>
                    <div className="flex items-center gap-3 min-w-0">
                      <SteamImage
                        appid={game.appid}
                        name={game.name}
                        headerImage={game.headerImage}
                        className="w-16 h-9 rounded object-cover shrink-0 bg-[oklch(0.14_0.015_260)]"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-[oklch(0.62_0.22_250)] transition-colors">{game.name}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {game.genre?.split(",").slice(0, 2).map((g) => (
                            <span key={g} className="text-xs text-[oklch(0.42_0.02_260)]">{g.trim()}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="hidden md:block text-right">
                      <p className="text-sm font-mono font-semibold text-[oklch(0.62_0.22_250)]">{formatNumber(game.ccu)}</p>
                      <p className="text-xs text-[oklch(0.38_0.02_260)]">playing</p>
                    </div>
                    <div className="hidden md:flex items-center justify-end gap-1.5">
                      <Trophy className="w-3 h-3 text-[oklch(0.78_0.18_75)]" />
                      <p className="text-sm font-mono text-[oklch(0.55_0.02_260)]">{formatNumber(game.peakPlayersAllTime)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {selectedGenre && totalPages && totalPages > 1 && (
          <div className="flex items-center justify-between mb-8">
            <p className="text-sm text-[oklch(0.45_0.02_260)]">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2 flex-wrap">
              {currentPage > 1 && (
                <Link href={getPageUrl(currentPage - 1, selectedGenre)}>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[oklch(0.13_0.015_260)] text-[oklch(0.5_0.02_260)] border border-[oklch(0.18_0.015_260)] hover:text-white hover:border-[oklch(0.25_0.02_260)] transition-all">
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                </Link>
              )}
              {/* Page number buttons — show up to 7 */}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let page: number;
                if (totalPages <= 7) {
                  page = i + 1;
                } else if (currentPage <= 4) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  page = totalPages - 6 + i;
                } else {
                  page = currentPage - 3 + i;
                }
                return (
                  <Link key={page} href={getPageUrl(page, selectedGenre)}>
                    <button className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                      page === currentPage
                        ? "bg-[oklch(0.62_0.22_250/0.15)] text-[oklch(0.62_0.22_250)] border-[oklch(0.62_0.22_250/0.3)]"
                        : "bg-[oklch(0.13_0.015_260)] text-[oklch(0.5_0.02_260)] border-[oklch(0.18_0.015_260)] hover:text-white hover:border-[oklch(0.25_0.02_260)]"
                    )}>
                      {page}
                    </button>
                  </Link>
                );
              })}
              {currentPage < totalPages && (
                <Link href={getPageUrl(currentPage + 1, selectedGenre)}>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[oklch(0.13_0.015_260)] text-[oklch(0.5_0.02_260)] border border-[oklch(0.18_0.015_260)] hover:text-white hover:border-[oklch(0.25_0.02_260)] transition-all">
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Genre stats overview */}
        {genreStats && (
          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-white mb-4">Genre Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {(genreStats as { genre: string; count: number; totalPlayers: number }[]).slice(0, 10).map((stat) => {
                const color = GENRE_COLORS[stat.genre] ?? "oklch(0.62 0.22 250)";
                return (
                  <button
                    key={stat.genre}
                    onClick={() => handleGenreClick(stat.genre)}
                    className="p-4 rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.11_0.015_260)] text-left hover:border-[oklch(0.28_0.02_260)] transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-white">{stat.genre}</p>
                      <ChevronRight className="w-3.5 h-3.5 text-[oklch(0.42_0.02_260)]" />
                    </div>
                    <p className="text-xs text-[oklch(0.42_0.02_260)] mb-1">{stat.count} games</p>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" style={{ color }} />
                      <span className="text-xs font-mono" style={{ color }}>{formatNumber(stat.totalPlayers)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <AdZone size="leaderboard" />
      </div>
    </>
  );
}
