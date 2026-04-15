import { useState } from "react";
import { X, Plus, GitCompare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { trpc } from "@/lib/trpc";
import AdZone from "@/components/AdZone";
import SEOHead from "@/components/SEOHead";
import { formatNumber, formatCommas, formatPlaytime, formatPrice, getHeaderImage } from "@/lib/utils";
import { cn } from "@/lib/utils";

const COMPARE_COLORS = [
  "oklch(0.62 0.22 250)",
  "oklch(0.72 0.2 145)",
  "oklch(0.78 0.18 75)",
  "oklch(0.62 0.22 295)",
];

const MAX_GAMES = 4;

type Period = "daily" | "weekly" | "monthly";

export default function Compare() {
  const [selectedAppIds, setSelectedAppIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState<Period>("weekly");

  const { data: searchResults, isLoading: searchLoading } = trpc.games.search.useQuery(
    { query: searchQuery, limit: 8 },
    { enabled: searchQuery.length >= 2 }
  );

  // Fetch history for all selected games
  const game1History = trpc.games.getPlayerHistory.useQuery(
    { appid: selectedAppIds[0]!, period },
    { enabled: !!selectedAppIds[0] }
  );
  const game2History = trpc.games.getPlayerHistory.useQuery(
    { appid: selectedAppIds[1]!, period },
    { enabled: !!selectedAppIds[1] }
  );
  const game3History = trpc.games.getPlayerHistory.useQuery(
    { appid: selectedAppIds[2]!, period },
    { enabled: !!selectedAppIds[2] }
  );
  const game4History = trpc.games.getPlayerHistory.useQuery(
    { appid: selectedAppIds[3]!, period },
    { enabled: !!selectedAppIds[3] }
  );

  const allHistories = [game1History, game2History, game3History, game4History];

  // Fetch game details for selected games
  const game1Detail = trpc.games.getGameDetail.useQuery(
    { appid: selectedAppIds[0]! },
    { enabled: !!selectedAppIds[0] }
  );
  const game2Detail = trpc.games.getGameDetail.useQuery(
    { appid: selectedAppIds[1]! },
    { enabled: !!selectedAppIds[1] }
  );
  const game3Detail = trpc.games.getGameDetail.useQuery(
    { appid: selectedAppIds[2]! },
    { enabled: !!selectedAppIds[2] }
  );
  const game4Detail = trpc.games.getGameDetail.useQuery(
    { appid: selectedAppIds[3]! },
    { enabled: !!selectedAppIds[3] }
  );

  const allDetails = [game1Detail, game2Detail, game3Detail, game4Detail];

  // Build merged chart data
  const allTimestamps = new Set<number>();
  allHistories.forEach((h, idx) => {
    if (selectedAppIds[idx] && h.data) {
      h.data.forEach((p) => allTimestamps.add(p.timestamp));
    }
  });

  const chartData = Array.from(allTimestamps).sort().map((ts) => {
    const point: Record<string, number> = { time: ts };
    allHistories.forEach((h, idx) => {
      if (selectedAppIds[idx] && h.data) {
        const match = h.data.find((p) => p.timestamp === ts);
        if (match) point[`game${idx}`] = match.players;
      }
    });
    return point;
  });

  function addGame(appid: number) {
    if (selectedAppIds.includes(appid) || selectedAppIds.length >= MAX_GAMES) return;
    setSelectedAppIds((prev) => [...prev, appid]);
    setSearchQuery("");
  }

  function removeGame(appid: number) {
    setSelectedAppIds((prev) => prev.filter((id) => id !== appid));
  }

  const { data: defaultGames } = trpc.games.getTopCharts.useQuery({ limit: 8, sortBy: "ccu" });

  return (
    <>
      <SEOHead
        title="Compare Steam Games — Side-by-Side Analytics"
        description="Compare up to 4 Steam games side-by-side with overlapping historical player count charts and detailed stats."
        url="/compare"
      />
      <div className="page-enter container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-white mb-2">
            Game <span className="gradient-text">Comparison</span>
          </h1>
          <p className="text-[oklch(0.55_0.02_260)]">Compare up to 4 games side-by-side with overlapping historical charts.</p>
        </div>

        <AdZone size="leaderboard" className="mb-8" />

        {/* Game selector */}
        <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-6 mb-8">
          <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-[oklch(0.62_0.22_250)]" />
            Select Games to Compare
            <span className="text-sm font-normal text-[oklch(0.45_0.02_260)]">({selectedAppIds.length}/{MAX_GAMES})</span>
          </h2>

          {/* Selected games */}
          <div className="flex flex-wrap gap-3 mb-4">
            {selectedAppIds.map((appid, idx) => {
              const detail = allDetails[idx]?.data;
              return (
                <div
                  key={appid}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                  style={{
                    borderColor: COMPARE_COLORS[idx]?.replace(")", " / 0.4)") ?? "",
                    background: COMPARE_COLORS[idx]?.replace(")", " / 0.08)") ?? "",
                  }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: COMPARE_COLORS[idx] }} />
                  <img
                    src={detail?.headerImage ?? getHeaderImage(appid)}
                    alt=""
                    className="w-12 h-7 rounded object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = getHeaderImage(appid); }}
                  />
                  <span className="text-sm font-medium text-white">{detail?.name ?? `Game ${appid}`}</span>
                  <button
                    onClick={() => removeGame(appid)}
                    className="ml-1 text-[oklch(0.45_0.02_260)] hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            {selectedAppIds.length < MAX_GAMES && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[oklch(0.25_0.02_260)] text-[oklch(0.42_0.02_260)]">
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add game</span>
              </div>
            )}
          </div>

          {/* Search */}
          {selectedAppIds.length < MAX_GAMES && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.42_0.02_260)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a game to add..."
                className="pl-10 bg-[oklch(0.13_0.015_260)] border-[oklch(0.22_0.015_260)] placeholder:text-[oklch(0.38_0.02_260)]"
              />
              {searchQuery.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-[oklch(0.22_0.015_260)] bg-[oklch(0.13_0.015_260)] shadow-2xl z-50 overflow-hidden">
                  {searchLoading ? (
                    <div className="p-3 text-sm text-[oklch(0.45_0.02_260)]">Searching...</div>
                  ) : (searchResults ?? []).length === 0 ? (
                    <div className="p-3 text-sm text-[oklch(0.45_0.02_260)]">No results found</div>
                  ) : (
                    <div>{(searchResults ?? []).map((game: { appid: number; name: string; headerImage?: string | null; ccu?: number | null }) => (<button
                        key={game.appid}
                        onClick={() => addGame(game.appid)}
                        disabled={selectedAppIds.includes(game.appid)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[oklch(0.17_0.015_260)] transition-colors",
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
                          <p className="text-xs text-[oklch(0.42_0.02_260)]">{formatNumber(game.ccu)} playing</p>
                        </div>
                        {selectedAppIds.includes(game.appid) && (
                          <span className="text-xs text-[oklch(0.42_0.02_260)]">Added</span>
                        )}
                      </button>
                    ))}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick add from top games */}
          {selectedAppIds.length === 0 && (
            <div className="mt-4">
              <p className="text-xs text-[oklch(0.42_0.02_260)] mb-2 uppercase tracking-wider font-mono">Quick Add — Top Games</p>
              <div className="flex flex-wrap gap-2">
                {(defaultGames ?? []).slice(0, 6).map((game) => (
                  <button
                    key={game.appid}
                    onClick={() => addGame(game.appid)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[oklch(0.14_0.015_260)] border border-[oklch(0.22_0.015_260)] hover:border-[oklch(0.62_0.22_250/0.4)] hover:bg-[oklch(0.62_0.22_250/0.08)] transition-all text-sm text-white"
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
          <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="font-display text-xl font-bold text-white">Player Count Comparison</h2>
              <div className="flex gap-2">
                {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      period === p
                        ? "bg-[oklch(0.62_0.22_250/0.15)] text-[oklch(0.62_0.22_250)] border border-[oklch(0.62_0.22_250/0.3)]"
                        : "bg-[oklch(0.14_0.015_260)] text-[oklch(0.5_0.02_260)] border border-[oklch(0.2_0.015_260)] hover:text-white"
                    )}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.015 260)" vertical={false} />
                <XAxis
                  dataKey="time"
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    if (period === "daily") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    if (period === "weekly") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
                  }}
                  tick={{ fill: "oklch(0.45 0.02 260)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => formatNumber(v)}
                  tick={{ fill: "oklch(0.45 0.02 260)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.14 0.015 260)",
                    border: "1px solid oklch(0.25 0.02 260)",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  formatter={(value: number, name: string) => {
                    const idx = parseInt(name.replace("game", ""));
                    const detail = allDetails[idx]?.data;
                    return [formatCommas(value), detail?.name ?? name];
                  }}
                />
                <Legend
                  formatter={(value: string) => {
                    const idx = parseInt(value.replace("game", ""));
                    return allDetails[idx]?.data?.name ?? value;
                  }}
                />
                {selectedAppIds.map((_, idx) => (
                  <Line
                    key={idx}
                    type="monotone"
                    dataKey={`game${idx}`}
                    stroke={COMPARE_COLORS[idx]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Stats comparison table */}
        {selectedAppIds.length >= 2 && (
          <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] overflow-hidden mb-8">
            <div className="p-5 border-b border-[oklch(0.16_0.015_260)]">
              <h2 className="font-display text-xl font-bold text-white">Stats Comparison</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[oklch(0.16_0.015_260)]">
                    <th className="text-left px-5 py-3 text-xs text-[oklch(0.42_0.02_260)] uppercase tracking-wider font-mono">Metric</th>
                    {selectedAppIds.map((appid, idx) => {
                      const detail = allDetails[idx]?.data;
                      return (
                        <th key={appid} className="text-right px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: COMPARE_COLORS[idx] }} />
                            <span className="text-sm font-semibold text-white truncate max-w-[120px]">
                              {detail?.name ?? `Game ${idx + 1}`}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[oklch(0.12_0.015_260)]">
                  {[
                    { label: "Current Players", key: "ccu", fmt: formatCommas },
                    { label: "All-Time Peak", key: "peakPlayersAllTime", fmt: formatCommas },
                    { label: "Total Owners", key: "ownersMax", fmt: formatNumber },
                    { label: "Avg Playtime", key: "averagePlaytimeForever", fmt: formatPlaytime },
                    { label: "Price", key: "priceUsd", fmt: (v: number, g: { isFree?: number }) => g?.isFree ? "Free" : formatPrice(v) },
                    { label: "Review Score", key: "positiveReviews", fmt: (v: number, g: { totalReviews?: number }) => g?.totalReviews ? `${Math.round((v / g.totalReviews) * 100)}%` : "—" },
                  ].map(({ label, key, fmt }) => (
                    <tr key={key} className="hover:bg-[oklch(0.12_0.015_260)] transition-colors">
                      <td className="px-5 py-3 text-sm text-[oklch(0.55_0.02_260)]">{label}</td>
                      {selectedAppIds.map((_, idx) => {
                        const detail = allDetails[idx]?.data as Record<string, number> | null | undefined;
                        const rawVal = detail?.[key] as number | undefined;
                        const displayVal = rawVal != null ? (fmt as (v: number, g: Record<string, number>) => string)(rawVal, detail as Record<string, number>) : "—";

                        // Highlight best value
                        const allVals = selectedAppIds.map((__, i) => {
                          const d = allDetails[i]?.data as Record<string, number> | null | undefined;
                          return d?.[key] as number | undefined;
                        });
                        const maxVal = Math.max(...allVals.filter((v): v is number => v != null));
                        const isBest = rawVal != null && rawVal === maxVal && maxVal > 0;

                        return (
                          <td key={idx} className="px-5 py-3 text-right">
                            <span className={cn(
                              "text-sm font-mono font-semibold",
                              isBest ? "text-[oklch(0.72_0.2_145)]" : "text-[oklch(0.65_0.02_260)]"
                            )}>
                              {displayVal}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {selectedAppIds.length === 0 && (
          <div className="text-center py-16">
            <GitCompare className="w-16 h-16 text-[oklch(0.3_0.02_260)] mx-auto mb-4" />
            <h3 className="font-display text-xl text-white mb-2">Select games to compare</h3>
            <p className="text-[oklch(0.5_0.02_260)]">Search for games above or use the quick-add buttons to get started.</p>
          </div>
        )}

        {selectedAppIds.length === 1 && (
          <div className="text-center py-8 text-[oklch(0.5_0.02_260)]">
            Add at least one more game to see the comparison.
          </div>
        )}

        <AdZone size="leaderboard" className="mt-8" />
      </div>
    </>
  );
}
