/**
 * Compare Page
 * Compare up to 4 Steam games side-by-side with overlapping Highcharts player count chart
 * and a stats comparison table with winner indicators.
 */

import { useState, useRef, useCallback } from "react";
import { X, Plus, GitCompare, Search, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { trpc } from "@/lib/trpc";
import AdZone from "@/components/AdZone";
import SEOHead from "@/components/SEOHead";
import { formatNumber, formatCommas, formatPlaytime, formatPrice, getHeaderImage } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Hex colors for Highcharts (SVG doesn't support OKLCH)
const COMPARE_COLORS_HEX = ["#6366f1", "#4ade80", "#f59e0b", "#a855f7"];
const COMPARE_COLORS_BG  = ["rgba(99,102,241,0.08)", "rgba(74,222,128,0.08)", "rgba(245,158,11,0.08)", "rgba(168,85,247,0.08)"];
const COMPARE_COLORS_BD  = ["rgba(99,102,241,0.4)",  "rgba(74,222,128,0.4)",  "rgba(245,158,11,0.4)",  "rgba(168,85,247,0.4)"];

const MAX_GAMES = 4;
type Period = "daily" | "weekly" | "monthly" | "yearly" | "all";

const PERIOD_BUTTONS: { key: Period; label: string }[] = [
  { key: "daily",   label: "7D" },
  { key: "weekly",  label: "1M" },
  { key: "monthly", label: "3M" },
  { key: "yearly",  label: "1Y" },
  { key: "all",     label: "All" },
];

export default function Compare() {
  const [selectedAppIds, setSelectedAppIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState<Period>("yearly");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: searchResults, isLoading: searchLoading } = trpc.games.search.useQuery(
    { query: searchQuery, limit: 8 },
    { enabled: searchQuery.length >= 2 }
  );

  // Fetch history for all 4 slots
  const game1History = trpc.games.getPlayerHistory.useQuery({ appid: selectedAppIds[0]!, period }, { enabled: !!selectedAppIds[0] });
  const game2History = trpc.games.getPlayerHistory.useQuery({ appid: selectedAppIds[1]!, period }, { enabled: !!selectedAppIds[1] });
  const game3History = trpc.games.getPlayerHistory.useQuery({ appid: selectedAppIds[2]!, period }, { enabled: !!selectedAppIds[2] });
  const game4History = trpc.games.getPlayerHistory.useQuery({ appid: selectedAppIds[3]!, period }, { enabled: !!selectedAppIds[3] });
  const allHistories = [game1History, game2History, game3History, game4History];

  // Fetch game details for all 4 slots
  const game1Detail = trpc.games.getGameDetail.useQuery({ appid: selectedAppIds[0]! }, { enabled: !!selectedAppIds[0] });
  const game2Detail = trpc.games.getGameDetail.useQuery({ appid: selectedAppIds[1]! }, { enabled: !!selectedAppIds[1] });
  const game3Detail = trpc.games.getGameDetail.useQuery({ appid: selectedAppIds[2]! }, { enabled: !!selectedAppIds[2] });
  const game4Detail = trpc.games.getGameDetail.useQuery({ appid: selectedAppIds[3]! }, { enabled: !!selectedAppIds[3] });
  const allDetails = [game1Detail, game2Detail, game3Detail, game4Detail];

  const { data: defaultGames } = trpc.games.getTopCharts.useQuery({ limit: 8, sortBy: "ccu" });

  const addGame = useCallback((appid: number) => {
    if (selectedAppIds.includes(appid) || selectedAppIds.length >= MAX_GAMES) return;
    setSelectedAppIds(prev => [...prev, appid]);
    setSearchQuery("");
  }, [selectedAppIds]);

  const removeGame = useCallback((appid: number) => {
    setSelectedAppIds(prev => prev.filter(id => id !== appid));
  }, []);

  // Build Highcharts series from history data
  const chartSeries: Highcharts.SeriesOptionsType[] = selectedAppIds
    .map((appid, idx) => {
      const h = allHistories[idx];
      if (!h?.data) return null;
      const detail = allDetails[idx]?.data;
      return {
        type: "spline" as const,
        name: (detail?.name ?? `Game ${idx + 1}`) as string,
        data: h.data.map(p => [p.timestamp, p.players] as [number, number]),
        color: COMPARE_COLORS_HEX[idx],
        lineWidth: 2,
        marker: { enabled: false, states: { hover: { enabled: true, radius: 4 } } },
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null) as Highcharts.SeriesOptionsType[];

  const chartOptions: Highcharts.Options = {
    chart: {
      type: "spline",
      backgroundColor: "transparent",
      height: 360,
      animation: { duration: 400 },
      style: { fontFamily: "'Inter', sans-serif" },
    },
    title: { text: undefined },
    xAxis: {
      type: "datetime",
      labels: { style: { color: "#94a3b8", fontSize: "11px" } },
      lineColor: "rgba(148,163,184,0.12)",
      tickColor: "rgba(148,163,184,0.12)",
      gridLineColor: "rgba(148,163,184,0.05)",
      crosshair: { color: "rgba(99,102,241,0.3)", dashStyle: "Dash", width: 1 },
    },
    yAxis: {
      title: { text: undefined },
      labels: {
        style: { color: "#94a3b8", fontSize: "11px" },
        formatter: function () {
          const v = this.value as number;
          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
          if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
          return String(v);
        },
      },
      gridLineColor: "rgba(148,163,184,0.07)",
      gridLineDashStyle: "Dot",
    },
    tooltip: {
      shared: true,
      useHTML: true,
      backgroundColor: "rgba(15,17,26,0.95)",
      borderColor: "rgba(99,102,241,0.4)",
      borderRadius: 8,
      style: { color: "#e2e8f0", fontSize: "13px" },
      formatter: function () {
        const d = new Date(this.x as number);
        const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
        let rows = "";
        (this.points ?? []).forEach(pt => {
          rows += `<div style="display:flex;align-items:center;gap:8px;margin-top:4px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${pt.series.color}"></span>
            <span style="color:#94a3b8;font-size:12px">${pt.series.name}:</span>
            <span style="color:#e2e8f0;font-size:13px;font-weight:600;font-family:monospace">${fmt(pt.y as number)}</span>
          </div>`;
        });
        return `<div style="padding:8px 12px;min-width:200px"><div style="color:#64748b;font-size:11px;margin-bottom:4px">${dateStr}</div>${rows}</div>`;
      },
    },
    legend: {
      enabled: true,
      align: "center",
      verticalAlign: "bottom",
      itemStyle: { color: "#94a3b8", fontWeight: "normal", fontSize: "12px" },
      itemHoverStyle: { color: "#e2e8f0" },
    },
    plotOptions: {
      spline: { lineWidth: 2, marker: { enabled: false } },
    },
    series: chartSeries,
    credits: { enabled: false },
    accessibility: { enabled: false },
    exporting: { enabled: false },
  };

  const statRows = [
    { label: "Current Players",  key: "ccu",                       fmt: (v: number) => formatCommas(v),                                                       higherIsBetter: true  },
    { label: "All-Time Peak",    key: "peakPlayersAllTime",         fmt: (v: number) => formatCommas(v),                                                       higherIsBetter: true  },
    { label: "Total Owners",     key: "ownersMax",                  fmt: (v: number) => formatNumber(v),                                                       higherIsBetter: true  },
    { label: "Avg Playtime",     key: "averagePlaytimeForever",     fmt: (v: number) => formatPlaytime(v),                                                     higherIsBetter: true  },
    { label: "Price",            key: "priceUsd",                   fmt: (v: number, g: Record<string,number>) => g?.isFree ? "Free to Play" : formatPrice(v), higherIsBetter: false },
    { label: "Positive Reviews", key: "positiveReviews",            fmt: (v: number, g: Record<string,number>) => g?.totalReviews ? `${Math.round((v / g.totalReviews) * 100)}%` : "—", higherIsBetter: true },
  ];

  return (
    <>
      <SEOHead
        title="Compare Steam Games | Side-by-Side Analytics | SteamPulse"
        description="Compare up to 4 Steam games side-by-side with overlapping historical player count charts and detailed stats."
        url="/compare"
      />
      <div className="page-enter container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-white mb-2">
            Game <span className="gradient-text">Comparison</span>
          </h1>
          <p className="text-slate-500">Compare up to 4 games side-by-side with overlapping historical charts.</p>
        </div>

        <AdZone size="leaderboard" className="mb-8" />

        {/* Game selector */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-6 mb-8">
          <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-indigo-400" />
            Select Games to Compare
            <span className="text-sm font-normal text-slate-500">({selectedAppIds.length}/{MAX_GAMES})</span>
          </h2>

          {/* Selected game chips + Add Game button */}
          <div className="flex flex-wrap gap-3 mb-4">
            {selectedAppIds.map((appid, idx) => {
              const detail = allDetails[idx]?.data;
              return (
                <div
                  key={appid}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                  style={{ borderColor: COMPARE_COLORS_BD[idx], background: COMPARE_COLORS_BG[idx] }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COMPARE_COLORS_HEX[idx] }} />
                  <img
                    src={detail?.headerImage ?? getHeaderImage(appid)}
                    alt=""
                    className="w-12 h-7 rounded object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = getHeaderImage(appid); }}
                  />
                  <span className="text-sm font-medium text-white">{detail?.name ?? `App ${appid}`}</span>
                  <button
                    onClick={() => removeGame(appid)}
                    className="ml-1 text-slate-500 hover:text-white transition-colors"
                    aria-label="Remove game"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Clickable "+ Add Game" button that focuses the search input */}
            {selectedAppIds.length < MAX_GAMES && (
              <button
                onClick={() => searchInputRef.current?.focus()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-600 text-slate-500 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add Game</span>
              </button>
            )}
          </div>

          {/* Search input */}
          {selectedAppIds.length < MAX_GAMES && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by game name or App ID..."
                className="pl-10 bg-slate-800/60 border-slate-700/60 placeholder:text-slate-600 text-slate-200 focus:border-indigo-500/60"
              />
              {searchQuery.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-slate-700/60 bg-slate-900 shadow-2xl z-50 overflow-hidden">
                  {searchLoading ? (
                    <div className="p-3 text-sm text-slate-500">Searching...</div>
                  ) : (searchResults ?? []).length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">No results found</div>
                  ) : (
                    <div>
                      {(searchResults ?? []).map((game: { appid: number; name: string; headerImage?: string | null; ccu?: number | null }) => (
                        <button
                          key={game.appid}
                          onClick={() => addGame(game.appid)}
                          disabled={selectedAppIds.includes(game.appid)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-800/60 transition-colors",
                            selectedAppIds.includes(game.appid) && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          <img
                            src={game.headerImage ?? getHeaderImage(game.appid)}
                            alt={game.name}
                            className="w-14 h-8 rounded object-cover shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).src = getHeaderImage(game.appid); }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{game.name}</p>
                            <p className="text-xs text-slate-500">{formatNumber(game.ccu)} playing</p>
                          </div>
                          {selectedAppIds.includes(game.appid) && (
                            <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">Added</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick add from top games */}
          {selectedAppIds.length === 0 && (
            <div className="mt-4">
              <p className="text-xs text-slate-600 mb-2 uppercase tracking-wider font-mono">Quick Add — Top Games</p>
              <div className="flex flex-wrap gap-2">
                {(defaultGames ?? []).slice(0, 6).map((game) => (
                  <button
                    key={game.appid}
                    onClick={() => addGame(game.appid)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all text-sm text-white"
                  >
                    <img
                      src={game.headerImage ?? getHeaderImage(game.appid)}
                      alt={game.name}
                      className="w-10 h-6 rounded object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = getHeaderImage(game.appid); }}
                    />
                    {game.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Comparison chart */}
        {selectedAppIds.length >= 2 && (
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="font-display text-xl font-bold text-white">Player Count Comparison</h2>
              <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700/40">
                {PERIOD_BUTTONS.map(btn => (
                  <button
                    key={btn.key}
                    onClick={() => setPeriod(btn.key)}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200",
                      period === btn.key
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                    )}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {chartSeries.length === 0 ? (
              <div className="h-[360px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden bg-slate-900/40 border border-slate-700/30 p-4">
                <HighchartsReact highcharts={Highcharts} options={chartOptions} />
              </div>
            )}
          </div>
        )}

        {/* Stats comparison table */}
        {selectedAppIds.length >= 2 && (
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 overflow-hidden mb-8">
            <div className="p-5 border-b border-slate-700/40">
              <h2 className="font-display text-xl font-bold text-white">Stats Comparison</h2>
              <p className="text-xs text-slate-500 mt-1">
                <Trophy className="w-3 h-3 inline-block mr-1 text-yellow-400" />
                Trophy indicates the winner for each metric
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/40">
                    <th className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wider font-mono">Metric</th>
                    {selectedAppIds.map((appid, idx) => {
                      const detail = allDetails[idx]?.data;
                      return (
                        <th key={appid} className="text-right px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COMPARE_COLORS_HEX[idx] }} />
                            <span className="text-sm font-semibold text-white truncate max-w-[140px]">
                              {detail?.name ?? `Game ${idx + 1}`}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {statRows.map(({ label, key, fmt, higherIsBetter }) => {
                    // Collect all numeric values for this metric
                    const allVals = selectedAppIds.map((_, i) => {
                      const d = allDetails[i]?.data as Record<string, number> | null | undefined;
                      return d?.[key] as number | undefined;
                    });
                    const validVals = allVals.filter((v): v is number => v != null && v > 0);
                    const winnerVal = validVals.length > 0
                      ? (higherIsBetter ? Math.max(...validVals) : Math.min(...validVals))
                      : null;

                    return (
                      <tr key={key} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-3 text-sm text-slate-400">{label}</td>
                        {selectedAppIds.map((_, idx) => {
                          const detail = allDetails[idx]?.data as Record<string, number> | null | undefined;
                          const rawVal = detail?.[key] as number | undefined;
                          const isWinner = rawVal != null && rawVal > 0 && rawVal === winnerVal;
                          const displayVal = rawVal != null
                            ? (fmt as (v: number, g: Record<string, number>) => string)(rawVal, detail as Record<string, number>)
                            : "—";

                          return (
                            <td key={idx} className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isWinner && (
                                  <Trophy className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                                )}
                                <span className={cn(
                                  "text-sm font-mono font-semibold",
                                  isWinner ? "text-yellow-300" : "text-slate-400"
                                )}>
                                  {displayVal}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {selectedAppIds.length === 0 && (
          <div className="text-center py-16">
            <GitCompare className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="font-display text-xl text-white mb-2">Select games to compare</h3>
            <p className="text-slate-500">Search for games above or use the quick-add buttons to get started.</p>
          </div>
        )}

        {selectedAppIds.length === 1 && (
          <div className="text-center py-8 text-slate-500">
            Add at least one more game to see the comparison.
          </div>
        )}

        <AdZone size="leaderboard" className="mt-8" />
      </div>
    </>
  );
}
