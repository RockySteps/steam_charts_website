/**
 * Upcoming Games / Calendar Page
 * Shows coming soon games from Steam's featured categories API.
 * SEO-friendly pagination: /upcoming/1-50/, /upcoming/51-100/, etc.
 */

import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import SEOHead from "@/components/SEOHead";
import SteamImage from "@/components/SteamImage";

const PAGE_SIZE = 50;

function parseRange(range?: string): { start: number; end: number } {
  if (!range) return { start: 1, end: PAGE_SIZE };
  const match = range.match(/^(\d+)-(\d+)$/);
  if (!match) return { start: 1, end: PAGE_SIZE };
  const start = Math.max(1, parseInt(match[1]!, 10));
  const end = parseInt(match[2]!, 10);
  return { start, end };
}

function getPageUrl(page: number): string {
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = page * PAGE_SIZE;
  return `/upcoming/${start}-${end}/`;
}

export default function UpcomingGames() {
  const params = useParams<{ range?: string }>();
  const { start, end } = parseRange(params.range);
  const offset = start - 1;
  const limit = end - offset;

  const { data, isLoading } = trpc.games.getUpcomingGames.useQuery(
    { cc: "us", limit: Math.min(limit, PAGE_SIZE), offset },
    { staleTime: 5 * 60 * 1000 }
  );

  const games = data?.games ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.ceil(start / PAGE_SIZE);

  // SEO pagination links
  const prevPage = currentPage > 1 ? getPageUrl(currentPage - 1) : null;
  const nextPage = currentPage < totalPages ? getPageUrl(currentPage + 1) : null;

  const pageTitle = currentPage > 1
    ? `Upcoming Steam Games ${start}-${end} | SteamPulse`
    : "Upcoming Steam Games — Release Calendar | SteamPulse";

  const pageDescription = `Browse upcoming games coming soon to Steam. ${total > 0 ? `${total} games scheduled for release.` : "Discover what's coming next to Steam."} Page ${currentPage} of ${totalPages || 1}.`;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://steampulse.io";
  const pageUrl = `/upcoming/${start}-${end}/`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Upcoming Steam Games",
      "description": pageDescription,
      "url": `${origin}${pageUrl}`,
      "numberOfItems": total,
      "itemListElement": games.slice(0, 10).map((g, i) => ({
        "@type": "ListItem",
        "position": offset + i + 1,
        "name": g.name,
        "url": `${origin}/game/${g.id}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${origin}/` },
        { "@type": "ListItem", "position": 2, "name": "Upcoming Games", "item": `${origin}/upcoming` },
        ...(currentPage > 1 ? [{ "@type": "ListItem", "position": 3, "name": `Page ${currentPage}`, "item": `${origin}${pageUrl}` }] : []),
      ],
    },
  ];

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        url={pageUrl}
        jsonLd={jsonLd}
        prevUrl={prevPage ?? undefined}
        nextUrl={nextPage ?? undefined}
      />

      <div className="container py-8 max-w-6xl mx-auto px-4">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-slate-300">Upcoming Games</span>
            {currentPage > 1 && (
              <>
                <span>/</span>
                <span className="text-slate-400">Page {currentPage}</span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            Upcoming Games
            {currentPage > 1 && <span className="text-slate-400 text-2xl ml-2">— Page {currentPage}</span>}
          </h1>
          <p className="text-slate-400 max-w-2xl">
            Games coming soon to Steam.{total > 0 ? ` ${total} games scheduled for release.` : ""} Updated in real-time from Steam's official store.
          </p>
        </div>

        {/* Games grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-700/40 bg-slate-800/40 overflow-hidden animate-pulse">
                <div className="w-full h-36 bg-slate-700/50" />
                <div className="p-3">
                  <div className="h-4 w-3/4 bg-slate-700/50 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-slate-700/50 rounded" />
                </div>
              </div>
            ))
            : games.map((game, idx) => (
              <Link
                key={game.id}
                href={`/game/${game.id}`}
                className="group rounded-xl border border-slate-700/40 bg-slate-800/40 hover:bg-slate-800/70 hover:border-indigo-500/30 overflow-hidden transition-all duration-200"
              >
                <div className="relative">
                  <SteamImage
                    appid={game.id}
                    name={game.name}
                    headerImage={game.headerImage}
                    className="w-full h-36 object-cover"
                  />
                  {/* Rank badge */}
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded-md px-2 py-0.5 text-xs font-bold text-slate-200">
                    #{offset + idx + 1}
                  </div>
                  {/* Coming Soon badge */}
                  <div className="absolute top-2 right-2 bg-amber-500/90 rounded-md px-2 py-0.5 text-xs font-bold text-white">
                    SOON
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors line-clamp-2 mb-2">
                    {game.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-400/80 font-medium">Coming Soon</span>
                    <a
                      href={`https://store.steampowered.com/app/${game.id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-slate-500 hover:text-indigo-400 transition-colors"
                    >
                      Steam ↗
                    </a>
                  </div>
                </div>
              </Link>
            ))
          }
        </div>

        {!isLoading && games.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <p>No upcoming games data available right now. Please try again later.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-slate-500">
              Showing {start}–{Math.min(end, total)} of {total} upcoming games
            </div>
            <div className="flex items-center gap-2">
              {prevPage && (
                <Link
                  href={prevPage}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-300 hover:bg-slate-700/60 hover:text-white transition-all text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </Link>
              )}

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                  const page = i + 1;
                  const isActive = page === currentPage;
                  return (
                    <Link
                      key={page}
                      href={getPageUrl(page)}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:bg-slate-700/60 hover:text-white"
                      }`}
                    >
                      {page}
                    </Link>
                  );
                })}
                {totalPages > 7 && (
                  <span className="text-slate-500 px-1">...</span>
                )}
              </div>

              {nextPage && (
                <Link
                  href={nextPage}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-300 hover:bg-slate-700/60 hover:text-white transition-all text-sm font-medium"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Source note */}
        <div className="mt-8 rounded-xl border border-slate-700/30 bg-slate-800/20 p-4 text-sm text-slate-500">
          <p>
            Upcoming games data is sourced directly from Steam's featured categories API (coming_soon section).
            Visit{" "}
            <a href="https://store.steampowered.com/search/?filter=comingsoon" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
              Steam Store
            </a>{" "}
            for the complete list.
          </p>
        </div>
      </div>
    </>
  );
}
