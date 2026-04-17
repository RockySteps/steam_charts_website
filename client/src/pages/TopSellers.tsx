/**
 * Top Sellers Page
 * Shows top selling games from Steam's featured categories API.
 */

import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import SEOHead from "@/components/SEOHead";
import SteamImage from "@/components/SteamImage";

function formatPrice(finalPrice: number | null, currency: string, isFree: boolean): string {
  if (isFree || finalPrice === 0) return "Free";
  if (finalPrice === null) return "—";
  // finalPrice is in cents
  const amount = finalPrice / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export default function TopSellers() {
  const { data, isLoading } = trpc.games.getTopSellers.useQuery(
    { cc: "us" },
    { staleTime: 5 * 60 * 1000 }
  );

  const games = data?.games ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Top Selling Steam Games",
    "description": "The best-selling games on Steam right now, updated in real-time from Steam's official store.",
    "url": "https://steampulse.io/top-sellers",
    "numberOfItems": games.length,
    "itemListElement": games.slice(0, 10).map((g, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": g.name,
      "url": `https://steampulse.io/game/${g.id}`,
    })),
  };

  return (
    <>
      <SEOHead
        title="Top Selling Steam Games Right Now | SteamPulse"
        description="Discover the best-selling games on Steam today. Real-time top sellers list updated directly from Steam's official store API."
        url="/top-sellers"
        jsonLd={jsonLd}
      />

      <div className="container py-8 max-w-6xl mx-auto px-4">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-slate-300">Top Sellers</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Top Selling Games</h1>
          <p className="text-slate-400 max-w-2xl">
            The best-selling games on Steam right now. Updated in real-time from Steam's official store.
          </p>
        </div>

        {/* Games grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                    #{idx + 1}
                  </div>
                  {/* Discount badge */}
                  {game.discountPercent > 0 && (
                    <div className="absolute top-2 right-2 bg-emerald-500 rounded-md px-2 py-0.5 text-xs font-bold text-white">
                      -{game.discountPercent}%
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors line-clamp-2 mb-2">
                    {game.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {game.discountPercent > 0 && game.originalPrice !== null && (
                        <span className="text-xs text-slate-500 line-through">
                          {formatPrice(game.originalPrice, game.currency, false)}
                        </span>
                      )}
                      <span className={`text-sm font-semibold ${game.finalPrice === 0 ? "text-emerald-400" : "text-slate-200"}`}>
                        {formatPrice(game.finalPrice, game.currency, game.finalPrice === 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          }
        </div>

        {!isLoading && games.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <p>No top sellers data available right now. Please try again later.</p>
          </div>
        )}

        {/* Source note */}
        <div className="mt-8 rounded-xl border border-slate-700/30 bg-slate-800/20 p-4 text-sm text-slate-500">
          <p>
            Top sellers data is sourced directly from Steam's featured categories API and reflects current bestsellers on the Steam store.
            Visit{" "}
            <a href="https://store.steampowered.com/search/?filter=topsellers" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
              Steam Store
            </a>{" "}
            for the complete list.
          </p>
        </div>
      </div>
    </>
  );
}
