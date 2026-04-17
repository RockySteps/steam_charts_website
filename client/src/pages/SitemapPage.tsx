import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import SEOHead from "@/components/SEOHead";
import { Map, BarChart2, TrendingUp, Layers, GitCompare, Search, Gamepad2, ChevronRight } from "lucide-react";

const GENRES = [
  "Action", "Adventure", "RPG", "Strategy", "Simulation",
  "Sports", "Racing", "Indie", "Casual", "Multiplayer",
  "Puzzle", "Horror", "Shooter", "Platformer", "Survival",
];

const CHART_PAGES = [
  { label: "Top 1–50 by Current Players", href: "/charts/top/1-50/" },
  { label: "Top 51–100 by Current Players", href: "/charts/top/51-100/" },
  { label: "Top 101–150 by Current Players", href: "/charts/top/101-150/" },
  { label: "Top 151–200 by Current Players", href: "/charts/top/151-200/" },
];

export default function SitemapPage() {
  const { data: topGames } = trpc.games.getTopCharts.useQuery({ sortBy: "ccu", limit: 50 });

  return (
    <>
      <SEOHead
        title="Sitemap | SteamPulse"
        description="Complete sitemap of SteamPulse — browse all Steam game analytics pages, genre categories, top charts, trending games, and more."
        url="/sitemap"
      />
      <div className="page-enter container py-10 max-w-5xl">
        <div className="mb-8 flex items-center gap-3">
          <Map className="w-8 h-8 text-[oklch(0.62_0.22_250)]" />
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Site Map</h1>
            <p className="text-[oklch(0.5_0.02_260)] text-sm mt-1">All pages and sections on SteamPulse</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Main sections */}
          <section>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white mb-4 pb-2 border-b border-[oklch(0.18_0.015_260)]">
              <BarChart2 className="w-4 h-4 text-[oklch(0.62_0.22_250)]" /> Main Sections
            </h2>
            <ul className="space-y-2">
              {[
                { href: "/", label: "Home — Steam Analytics Dashboard" },
                { href: "/charts", label: "Top Charts — Live Player Rankings" },
                { href: "/trending", label: "Trending — Biggest Movers Today" },
                { href: "/genres", label: "Genres — Browse by Category" },
                { href: "/compare", label: "Compare — Side-by-Side Game Stats" },
                { href: "/search", label: "Search — Find Any Steam Game" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="flex items-center gap-2 text-[oklch(0.62_0.22_250)] hover:text-white transition-colors text-sm">
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Top Charts pages */}
          <section>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white mb-4 pb-2 border-b border-[oklch(0.18_0.015_260)]">
              <TrendingUp className="w-4 h-4 text-[oklch(0.78_0.18_75)]" /> Top Charts Pages
            </h2>
            <ul className="space-y-2">
              {CHART_PAGES.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="flex items-center gap-2 text-[oklch(0.62_0.22_250)] hover:text-white transition-colors text-sm">
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Genres */}
          <section>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white mb-4 pb-2 border-b border-[oklch(0.18_0.015_260)]">
              <Layers className="w-4 h-4 text-[oklch(0.7_0.18_195)]" /> Genre Pages
            </h2>
            <ul className="space-y-2">
              {GENRES.map((genre) => (
                <li key={genre}>
                  <Link href={`/genres/${genre.toLowerCase()}/1-50/`} className="flex items-center gap-2 text-[oklch(0.62_0.22_250)] hover:text-white transition-colors text-sm">
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    {genre} Games — Page 1 (1–50)
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Top 50 game pages */}
          <section>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white mb-4 pb-2 border-b border-[oklch(0.18_0.015_260)]">
              <Gamepad2 className="w-4 h-4 text-[oklch(0.62_0.22_25)]" /> Top 50 Game Pages
            </h2>
            {topGames ? (
              <ul className="space-y-2">
                {topGames.map((game) => (
                  <li key={game.appid}>
                    <Link href={`/game/${game.appid}`} className="flex items-center gap-2 text-[oklch(0.62_0.22_250)] hover:text-white transition-colors text-sm">
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      {game.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="shimmer h-4 w-48 rounded" />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* XML sitemap link */}
        <div className="mt-10 p-4 rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.11_0.015_260)]">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-[oklch(0.62_0.22_250)]" />
            <p className="text-sm font-semibold text-white">Search Engine Sitemap</p>
          </div>
          <p className="text-xs text-[oklch(0.45_0.02_260)] mb-2">
            For search engines and crawlers, the XML sitemap is available at:
          </p>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[oklch(0.62_0.22_250)] hover:text-white transition-colors font-mono"
          >
            /sitemap.xml
          </a>
        </div>
      </div>
    </>
  );
}
