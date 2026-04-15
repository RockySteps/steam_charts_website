import { useState } from "react";
import { Link, useSearch } from "wouter";
import { Layers, Users, Trophy, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import AdZone from "@/components/AdZone";
import SEOHead from "@/components/SEOHead";
import { formatNumber, getHeaderImage } from "@/lib/utils";
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

export default function Genres() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialGenre = params.get("g") ?? "";
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);

  const { data: games, isLoading } = trpc.games.getTopCharts.useQuery({
    sortBy: "ccu",
    limit: 50,
    genre: selectedGenre || undefined,
  });

  const { data: genreStats } = trpc.games.getGenres.useQuery();

  return (
    <>
      <SEOHead
        title="Steam Genre Explorer — Browse Games by Category"
        description="Explore Steam games by genre. Find the most popular Action, RPG, Strategy, Simulation, and more games ranked by current players."
        url="/genres"
      />
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
          <button
            onClick={() => setSelectedGenre("")}
            className={cn(
              "p-4 rounded-xl border text-left transition-all duration-200",
              !selectedGenre
                ? "border-[oklch(0.62_0.22_250/0.5)] bg-[oklch(0.62_0.22_250/0.1)] text-[oklch(0.62_0.22_250)]"
                : "border-[oklch(0.18_0.015_260)] bg-[oklch(0.11_0.015_260)] text-[oklch(0.55_0.02_260)] hover:border-[oklch(0.28_0.02_260)] hover:text-white"
            )}
          >
            <Layers className="w-5 h-5 mb-2" />
            <p className="text-sm font-semibold">All Games</p>
            {genreStats && (
              <p className="text-xs opacity-70 mt-0.5">{genreStats.length} genres</p>
            )}
          </button>
          {ALL_GENRES.map((genre) => {
            const color = GENRE_COLORS[genre] ?? "oklch(0.62 0.22 250)";
            const isActive = selectedGenre === genre;
            const stat = genreStats?.find((g: { genre: string }) => g.genre === genre);
            return (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-white">
            {selectedGenre ? (
              <>
                <span style={{ color: GENRE_COLORS[selectedGenre] }}>{selectedGenre}</span> Games
              </>
            ) : "All Top Games"}
          </h2>
          <span className="text-sm text-[oklch(0.45_0.02_260)]">{games?.length ?? 0} results</span>
        </div>

        <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] overflow-hidden mb-8">
          <div className="hidden md:grid grid-cols-[3rem_1fr_9rem_9rem] gap-3 px-4 py-3 border-b border-[oklch(0.16_0.015_260)] text-xs text-[oklch(0.42_0.02_260)] uppercase tracking-wider font-mono">
            <span>#</span>
            <span>Game</span>
            <span className="text-right">Players Now</span>
            <span className="text-right">Peak</span>
          </div>
          {isLoading ? (
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
          ) : (
            <div className="divide-y divide-[oklch(0.12_0.015_260)]">
              {(games ?? []).map((game, idx) => (
                <Link key={game.appid} href={`/game/${game.appid}`}>
                  <div className="group grid grid-cols-[3rem_1fr] md:grid-cols-[3rem_1fr_9rem_9rem] gap-3 px-4 py-3 items-center hover:bg-[oklch(0.13_0.015_260)] transition-colors cursor-pointer">
                    <span className={cn(
                      "rank-badge text-center",
                      idx === 0 ? "text-[oklch(0.78_0.18_75)]" :
                      idx === 1 ? "text-[oklch(0.75_0.02_260)]" :
                      idx === 2 ? "text-[oklch(0.65_0.12_50)]" :
                      "text-[oklch(0.42_0.02_260)]"
                    )}>
                      {idx + 1}
                    </span>
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={game.headerImage ?? getHeaderImage(game.appid)}
                        alt={game.name}
                        className="w-16 h-9 rounded object-cover shrink-0 bg-[oklch(0.14_0.015_260)]"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).src = getHeaderImage(game.appid); }}
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
                    onClick={() => setSelectedGenre(stat.genre)}
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
