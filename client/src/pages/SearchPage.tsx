import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { Search, Filter, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import GameCard from "@/components/GameCard";
import AdZone from "@/components/AdZone";
import SEOHead from "@/components/SEOHead";
import { cn } from "@/lib/utils";

const GENRES = [
  "Action", "Adventure", "RPG", "Strategy", "Simulation",
  "Sports", "Racing", "Indie", "Casual", "Multiplayer",
  "Puzzle", "Horror", "Shooter", "Platformer", "Survival",
];

const SORT_OPTIONS = [
  { value: "ccu", label: "Current Players" },
  { value: "peakPlayersAllTime", label: "All-Time Peak" },
  { value: "ownersMax", label: "Most Owned" },
  { value: "averagePlaytimeForever", label: "Avg Playtime" },
];

export default function SearchPage() {
  const searchStr = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(searchStr);

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [genre, setGenre] = useState("");
  const [sortBy, setSortBy] = useState<"ccu" | "peakPlayersAllTime" | "ownersMax" | "averagePlaytimeForever">("ccu");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [playerRange, setPlayerRange] = useState<[number, number]>([0, 500000]);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const LIMIT = 24;

  // Sync query param to state
  useEffect(() => {
    const q = params.get("q") ?? "";
    setQuery(q);
  }, [searchStr]);

  const { data: results, isLoading } = trpc.games.search.useQuery({
    query: query || undefined,
    genre: genre || undefined,
    minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < 100 ? priceRange[1] : undefined,
    minPlayers: playerRange[0] > 0 ? playerRange[0] : undefined,
    maxPlayers: playerRange[1] < 500000 ? playerRange[1] : undefined,
    limit: LIMIT,
    offset: page * LIMIT,
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate("/search");
    }
  }

  function clearFilters() {
    setGenre("");
    setPriceRange([0, 100]);
    setPlayerRange([0, 500000]);
    setSortBy("ccu");
    setPage(0);
  }

  const hasActiveFilters = genre || priceRange[0] > 0 || priceRange[1] < 100 || playerRange[0] > 0 || playerRange[1] < 500000;

  // Sort results client-side
  const sortedResults = [...(results ?? [])].sort((a, b) => {
    const aVal = (a[sortBy] as number | null) ?? 0;
    const bVal = (b[sortBy] as number | null) ?? 0;
    return bVal - aVal;
  });

  return (
    <>
      <SEOHead
        title={query ? `Search: "${query}" — Steam Games` : "Search Steam Games"}
        description="Search and filter Steam games by name, genre, price, player count, and more. Find the perfect game with advanced filters."
        url="/search"
      />
      <div className="page-enter container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-white mb-2">
            Game <span className="gradient-text">Search</span>
          </h1>
          <p className="text-[oklch(0.55_0.02_260)]">Search and filter through all tracked Steam games.</p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[oklch(0.42_0.02_260)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search games by name..."
              className="pl-12 h-12 text-base bg-[oklch(0.13_0.015_260)] border-[oklch(0.22_0.015_260)] placeholder:text-[oklch(0.38_0.02_260)] focus:border-[oklch(0.62_0.22_250/0.6)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); navigate("/search"); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[oklch(0.42_0.02_260)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button type="submit" size="lg" className="h-12 px-6 bg-[oklch(0.62_0.22_250)] hover:bg-[oklch(0.68_0.22_250)] text-white">
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={cn(
              "h-12 px-4 border-[oklch(0.22_0.015_260)] hover:bg-[oklch(0.14_0.015_260)]",
              showFilters && "bg-[oklch(0.62_0.22_250/0.1)] border-[oklch(0.62_0.22_250/0.4)] text-[oklch(0.62_0.22_250)]"
            )}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </form>

        {/* Filters panel */}
        {showFilters && (
          <div className="rounded-xl border border-[oklch(0.22_0.015_260)] bg-[oklch(0.11_0.015_260)] p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                <Filter className="w-4 h-4 text-[oklch(0.62_0.22_250)]" />
                Advanced Filters
              </h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-[oklch(0.5_0.02_260)] hover:text-white text-xs">
                  Clear All
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Genre */}
              <div>
                <label className="text-xs text-[oklch(0.5_0.02_260)] uppercase tracking-wider font-mono mb-2 block">Genre</label>
                <Select value={genre || "all"} onValueChange={(v) => { setGenre(v === "all" ? "" : v); setPage(0); }}>
                  <SelectTrigger className="bg-[oklch(0.14_0.015_260)] border-[oklch(0.22_0.015_260)]">
                    <SelectValue placeholder="All Genres" />
                  </SelectTrigger>
                  <SelectContent className="bg-[oklch(0.14_0.015_260)] border-[oklch(0.22_0.015_260)]">
                    <SelectItem value="all">All Genres</SelectItem>
                    {GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div>
                <label className="text-xs text-[oklch(0.5_0.02_260)] uppercase tracking-wider font-mono mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="bg-[oklch(0.14_0.015_260)] border-[oklch(0.22_0.015_260)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[oklch(0.14_0.015_260)] border-[oklch(0.22_0.015_260)]">
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price range */}
              <div>
                <label className="text-xs text-[oklch(0.5_0.02_260)] uppercase tracking-wider font-mono mb-2 block">
                  Price: ${priceRange[0]} — ${priceRange[1] >= 100 ? "100+" : priceRange[1]}
                </label>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={priceRange}
                  onValueChange={(v) => { setPriceRange(v as [number, number]); setPage(0); }}
                  className="mt-3"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-[oklch(0.38_0.02_260)]">Free</span>
                  <span className="text-xs text-[oklch(0.38_0.02_260)]">$100+</span>
                </div>
              </div>

              {/* Player range */}
              <div>
                <label className="text-xs text-[oklch(0.5_0.02_260)] uppercase tracking-wider font-mono mb-2 block">
                  Players: {playerRange[0] > 0 ? `${(playerRange[0] / 1000).toFixed(0)}K` : "0"} — {playerRange[1] >= 500000 ? "500K+" : `${(playerRange[1] / 1000).toFixed(0)}K`}
                </label>
                <Slider
                  min={0}
                  max={500000}
                  step={5000}
                  value={playerRange}
                  onValueChange={(v) => { setPlayerRange(v as [number, number]); setPage(0); }}
                  className="mt-3"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-[oklch(0.38_0.02_260)]">0</span>
                  <span className="text-xs text-[oklch(0.38_0.02_260)]">500K+</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {genre && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[oklch(0.62_0.22_250/0.1)] border border-[oklch(0.62_0.22_250/0.3)] text-xs text-[oklch(0.62_0.22_250)]">
                Genre: {genre}
                <button onClick={() => setGenre("")}><X className="w-3 h-3" /></button>
              </span>
            )}
            {(priceRange[0] > 0 || priceRange[1] < 100) && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[oklch(0.72_0.2_145/0.1)] border border-[oklch(0.72_0.2_145/0.3)] text-xs text-[oklch(0.72_0.2_145)]">
                Price: ${priceRange[0]}–${priceRange[1]}
                <button onClick={() => setPriceRange([0, 100])}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}

        <AdZone size="leaderboard" className="mb-6" />

        {/* Results */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[oklch(0.5_0.02_260)]">
            {isLoading ? "Searching..." : `${sortedResults.length} results${query ? ` for "${query}"` : ""}`}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-[oklch(0.11_0.015_260)] border border-[oklch(0.18_0.015_260)] overflow-hidden">
                <div className="shimmer aspect-[460/215]" />
                <div className="p-3 space-y-2">
                  <div className="shimmer h-4 w-3/4 rounded" />
                  <div className="shimmer h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedResults.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-[oklch(0.3_0.02_260)] mx-auto mb-4" />
            <h3 className="font-display text-xl text-white mb-2">No games found</h3>
            <p className="text-[oklch(0.5_0.02_260)] mb-6">
              {query ? `No results for "${query}". Try a different search term.` : "Try adjusting your filters."}
            </p>
            <Button onClick={clearFilters} variant="outline" className="border-[oklch(0.25_0.02_260)]">
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedResults.map((game, idx) => (
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
                rank={page * LIMIT + idx + 1}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {sortedResults.length > 0 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="border-[oklch(0.22_0.015_260)] text-[oklch(0.6_0.02_260)] hover:bg-[oklch(0.14_0.015_260)]"
            >
              Previous
            </Button>
            <span className="text-sm text-[oklch(0.5_0.02_260)]">Page {page + 1}</span>
            <Button
              variant="outline"
              disabled={sortedResults.length < LIMIT}
              onClick={() => setPage(p => p + 1)}
              className="border-[oklch(0.22_0.015_260)] text-[oklch(0.6_0.02_260)] hover:bg-[oklch(0.14_0.015_260)]"
            >
              Next
            </Button>
          </div>
        )}

        <AdZone size="leaderboard" className="mt-8" />
      </div>
    </>
  );
}
