/**
 * Steam Live Stats Page
 * Shows worldwide concurrent Steam players and top games live player counts.
 * Data sourced from Steam's public API (no API key required).
 */

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import SEOHead from "@/components/SEOHead";
import SteamImage from "@/components/SteamImage";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function LiveStats() {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(60);

  const { data, isLoading, refetch } = trpc.games.getSteamLiveStats.useQuery(
    { cc: "us" },
    { staleTime: 60 * 1000, refetchInterval: 60 * 1000 }
  );

  // Countdown timer for next refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setLastRefresh(new Date());
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    refetch();
    setLastRefresh(new Date());
    setCountdown(60);
  };

  const worldwidePlayers = data?.worldwidePlayers ?? 0;
  const topGames = data?.topGames ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Steam Live Player Stats — Worldwide Concurrent Players",
    "description": "Real-time Steam concurrent player statistics. See how many players are online right now across all Steam games worldwide.",
    "url": "https://steampulse.io/live",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://steampulse.io/" },
        { "@type": "ListItem", "position": 2, "name": "Live Stats", "item": "https://steampulse.io/live" },
      ],
    },
  };

  return (
    <>
      <SEOHead
        title="Steam Live Player Stats — Worldwide Concurrent Players | SteamPulse"
        description={`Real-time Steam concurrent player statistics. ${worldwidePlayers > 0 ? `${formatNumber(worldwidePlayers)} players online right now` : "See how many players are online right now"} across all Steam games worldwide.`}
        url="/live"
        jsonLd={jsonLd}
      />

      <div className="container py-8 max-w-6xl mx-auto px-4">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-xs font-mono text-red-400 uppercase tracking-widest">Live</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Steam Live Player Stats</h1>
          <p className="text-slate-400 max-w-2xl">
            Real-time concurrent player counts across all Steam games worldwide. Data updates every 60 seconds from Steam's official API.
          </p>
        </div>

        {/* Worldwide players hero card */}
        <div className="relative mb-8 rounded-2xl overflow-hidden border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-purple-600/5" />
          <div className="relative">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-2 uppercase tracking-wider">Worldwide Concurrent Players</p>
                {isLoading ? (
                  <div className="h-16 w-64 bg-slate-700/50 rounded-xl animate-pulse" />
                ) : (
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-bold text-white tabular-nums">
                      {formatNumber(worldwidePlayers)}
                    </span>
                    <span className="text-slate-400 text-lg">players online</span>
                  </div>
                )}
                <p className="text-slate-500 text-sm mt-3">
                  Last updated: {lastRefresh.toLocaleTimeString()} · Next refresh in {countdown}s
                </p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <button
                  onClick={handleManualRefresh}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 hover:text-indigo-300 transition-all text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Now
                </button>
                <a
                  href="https://store.steampowered.com/charts/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
                >
                  View on Steam ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Top games live */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Top Games Right Now</h2>
          <div className="rounded-xl border border-slate-700/50 overflow-hidden bg-slate-900/40">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/40">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 w-12">#</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Game</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Live Players</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">All-Time Peak</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Genre</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-800/50">
                      <td className="px-4 py-3"><div className="h-4 w-6 bg-slate-700/50 rounded animate-pulse" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-700/50 rounded animate-pulse" />
                          <div className="h-4 w-40 bg-slate-700/50 rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-700/50 rounded animate-pulse ml-auto" /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 w-20 bg-slate-700/50 rounded animate-pulse ml-auto" /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-24 bg-slate-700/50 rounded animate-pulse" /></td>
                    </tr>
                  ))
                  : topGames.map((game, idx) => (
                    <tr
                      key={game.appid}
                      className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-500 font-mono text-sm">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/game/${game.appid}`} className="flex items-center gap-3 group">
                          <SteamImage
                            appid={game.appid}
                            name={game.name}
                            className="w-12 h-7 object-cover rounded"
                          />
                          <span className="text-slate-200 font-medium group-hover:text-indigo-400 transition-colors line-clamp-1">
                            {game.name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-emerald-400 font-semibold font-mono tabular-nums">
                          {formatNumber(game.ccu)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="text-slate-400 font-mono tabular-nums text-sm">
                          {formatNumber(game.peakPlayersAllTime)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-slate-500 text-sm">{game.genre || "—"}</span>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Info footer */}
        <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 p-4 text-sm text-slate-500">
          <p>
            Player counts are sourced directly from Steam's official API. The worldwide concurrent player count includes all active Steam sessions, not just in-game players.
            Data is refreshed every 60 seconds. For the most up-to-date information, visit{" "}
            <a href="https://store.steampowered.com/charts/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
              Steam Charts
            </a>.
          </p>
        </div>
      </div>
    </>
  );
}
