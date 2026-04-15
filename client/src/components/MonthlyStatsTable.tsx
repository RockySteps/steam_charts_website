/**
 * MonthlyStatsTable
 * Displays monthly player statistics: Month, Avg Players, Gain, % Gain, Peak Players
 * Matches the style shown in the reference screenshot with green/red gain coloring
 */

import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  appid: number;
}

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatAvg(n: number): string {
  if (n === 0) return "0";
  return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatPeak(n: number): string {
  return n.toLocaleString("en-US");
}

function formatGain(n: number): string {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return n >= 0 ? `+${formatted}` : `-${formatted}`;
}

function formatGainPct(n: number): string {
  const abs = Math.abs(n);
  const formatted = abs.toFixed(2);
  return n >= 0 ? `+${formatted}%` : `-${formatted}%`;
}

export default function MonthlyStatsTable({ appid }: Props) {
  const { data, isLoading } = trpc.games.getMonthlyStats.useQuery(
    { appid, limit: 24 },
    { staleTime: 10 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <div className="w-full overflow-hidden rounded-xl border border-slate-700/40 bg-slate-900/60">
        <div className="p-4 border-b border-slate-700/40">
          <div className="h-5 w-40 bg-slate-700/50 rounded animate-pulse" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-slate-800/60">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 flex-1 bg-slate-800/60 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full rounded-xl border border-slate-700/40 bg-slate-900/60 p-8 text-center">
        <p className="text-slate-500 text-sm">No monthly data available yet. Data will appear as the crawler processes this game.</p>
      </div>
    );
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-700/40 bg-slate-900/60">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/40 bg-slate-800/40">
        <h3 className="text-sm font-semibold text-slate-200 tracking-wide">Monthly Player Statistics</h3>
        <p className="text-xs text-slate-500 mt-0.5">Average concurrent players per calendar month</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/40">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-40">Month</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg. Players</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Gain</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">% Gain</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Peak Players</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const isCurrentMonth = row.year === currentYear && row.month === currentMonth;
              const isPositive = row.gain > 0;
              const isNegative = row.gain < 0;
              const monthLabel = isCurrentMonth
                ? "Last 30 Days"
                : `${MONTH_NAMES[row.month]} ${row.year}`;

              return (
                <tr
                  key={`${row.year}-${row.month}`}
                  className={`border-b border-slate-800/40 transition-colors hover:bg-slate-800/30 ${
                    isCurrentMonth ? "bg-indigo-950/20" : idx % 2 === 0 ? "" : "bg-slate-800/10"
                  }`}
                >
                  {/* Month */}
                  <td className="px-4 py-2.5">
                    <span className={`font-medium ${isCurrentMonth ? "italic text-slate-300" : "text-slate-300"}`}>
                      {monthLabel}
                    </span>
                  </td>

                  {/* Avg Players */}
                  <td className="px-4 py-2.5 text-right">
                    <span className="font-mono text-slate-200 font-medium">
                      {formatAvg(row.avgPlayers)}
                    </span>
                  </td>

                  {/* Gain */}
                  <td className="px-4 py-2.5 text-right">
                    {row.gain === 0 && idx === data.length - 1 ? (
                      <span className="text-slate-500 font-mono">—</span>
                    ) : (
                      <span className={`font-mono font-semibold ${
                        isPositive ? "text-emerald-400" : isNegative ? "text-red-400" : "text-slate-400"
                      }`}>
                        {formatGain(row.gain)}
                      </span>
                    )}
                  </td>

                  {/* % Gain */}
                  <td className="px-4 py-2.5 text-right">
                    {row.gainPercent === 0 && idx === data.length - 1 ? (
                      <span className="text-slate-500 font-mono">—</span>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        ) : isNegative ? (
                          <TrendingDown className="w-3 h-3 text-red-400 flex-shrink-0" />
                        ) : (
                          <Minus className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        )}
                        <span className={`font-mono font-semibold ${
                          isPositive ? "text-emerald-400" : isNegative ? "text-red-400" : "text-slate-400"
                        }`}>
                          {formatGainPct(row.gainPercent)}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Peak Players */}
                  <td className="px-4 py-2.5 text-right">
                    <span className="font-mono text-slate-200 font-medium">
                      {formatPeak(row.peakPlayers)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-700/40 bg-slate-800/20">
        <p className="text-xs text-slate-600">
          Data sourced from Steam API and SteamSpy. Updated every 24 hours.
        </p>
      </div>
    </div>
  );
}
