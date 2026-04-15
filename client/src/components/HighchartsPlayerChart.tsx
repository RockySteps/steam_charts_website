/**
 * HighchartsPlayerChart
 * Premium dark-themed player count chart using Highcharts
 * Features: period switching, PNG/SVG/Print export, tooltips, zoom
 */

import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

// Initialize Highcharts modules using dynamic import with type assertion
void Promise.all([
  import("highcharts/modules/exporting"),
  import("highcharts/modules/export-data"),
  import("highcharts/modules/offline-exporting"),
  import("highcharts/modules/accessibility"),
]).then(([exp, expData, offline, a11y]) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hc = Highcharts as any;
  if (!hc._modulesLoaded) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (exp as any).default(Highcharts);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (expData as any).default(Highcharts);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (offline as any).default(Highcharts);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a11y as any).default(Highcharts);
    hc._modulesLoaded = true;
  }
});

// Apply global dark theme
Highcharts.setOptions({
  chart: {
    backgroundColor: "transparent",
    style: { fontFamily: "'Inter', 'Rajdhani', sans-serif" },
  },
  colors: ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e"],
  title: { style: { color: "#f1f5f9" } },
  subtitle: { style: { color: "#94a3b8" } },
  xAxis: {
    gridLineColor: "rgba(148,163,184,0.08)",
    lineColor: "rgba(148,163,184,0.2)",
    tickColor: "rgba(148,163,184,0.2)",
    labels: { style: { color: "#94a3b8", fontSize: "11px" } },
  },
  yAxis: {
    gridLineColor: "rgba(148,163,184,0.08)",
    lineColor: "rgba(148,163,184,0.2)",
    labels: { style: { color: "#94a3b8", fontSize: "11px" } },
  },
  tooltip: {
    backgroundColor: "rgba(15,23,42,0.95)",
    borderColor: "rgba(99,102,241,0.4)",
    borderRadius: 8,
    style: { color: "#f1f5f9", fontSize: "13px" },
    shadow: { color: "rgba(99,102,241,0.2)", offsetX: 0, offsetY: 4, opacity: 0.4, width: 16 },
  },
  legend: {
    itemStyle: { color: "#94a3b8", fontWeight: "normal" },
    itemHoverStyle: { color: "#f1f5f9" },
  },
  credits: { enabled: false },
  navigation: {
    menuStyle: {
      background: "rgba(15,23,42,0.98)",
      border: "1px solid rgba(99,102,241,0.3)",
      borderRadius: "8px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    },
    menuItemStyle: {
      color: "#94a3b8",
      fontSize: "13px",
      padding: "8px 16px",
    },
    menuItemHoverStyle: {
      background: "rgba(99,102,241,0.15)",
      color: "#f1f5f9",
    },
  },
  exporting: {
    enabled: true,
    filename: "steampulse-chart",
    sourceWidth: 1200,
    sourceHeight: 500,
    scale: 2,
    menuItemDefinitions: {
      downloadPNG: { text: "Download PNG" },
      downloadSVG: { text: "Download SVG" },
      printChart: { text: "Print Chart" },
    },
    buttons: {
      contextButton: {
        menuItems: ["downloadPNG", "downloadSVG", "separator", "printChart"],
        text: "",
        titleKey: "contextButtonTitle",
      },
    },
  },
});

type Period = "daily" | "weekly" | "monthly" | "yearly";

interface Props {
  appid: number;
  gameName: string;
  currentPlayers?: number;
  peakPlayers?: number;
  /** If true, show as comparison chart (multi-series) */
  comparisonMode?: boolean;
  comparisonSeries?: Array<{ name: string; data: Array<{ timestamp: number; players: number }> }>;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "daily", label: "24H" },
  { key: "weekly", label: "7D" },
  { key: "monthly", label: "30D" },
  { key: "yearly", label: "1Y" },
];

function formatPlayerCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function HighchartsPlayerChart({ appid, gameName, currentPlayers = 0, peakPlayers = 0, comparisonMode = false, comparisonSeries }: Props) {
  const [period, setPeriod] = useState<Period>("monthly");
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  const { data: historyData, isLoading } = trpc.games.getPlayerHistory.useQuery(
    { appid, period },
    { enabled: !comparisonMode, staleTime: 5 * 60 * 1000 }
  );

  const chartOptions: Highcharts.Options = {
    chart: {
      type: "areaspline",
      height: 340,
      backgroundColor: "transparent",
      animation: { duration: 600, easing: "easeInOutQuart" },
      zooming: { type: "x" },
      panning: { enabled: true, type: "x" },
      panKey: "shift",
      style: { fontFamily: "'Inter', sans-serif" },
    },
    title: { text: undefined },
    xAxis: {
      type: "datetime",
      crosshair: {
        color: "rgba(99,102,241,0.3)",
        dashStyle: "Dash",
        width: 1,
      },
      dateTimeLabelFormats: {
        hour: "%H:%M",
        day: "%b %e",
        week: "%b %e",
        month: "%b '%y",
        year: "%Y",
      },
    },
    yAxis: {
      title: { text: undefined },
      labels: {
        formatter: function () {
          return formatPlayerCount(Number(this.value));
        },
      },
      min: 0,
    },
    tooltip: {
      shared: true,
      xDateFormat: period === "daily" ? "%A, %b %e %H:%M" : period === "yearly" ? "%B %Y" : "%A, %b %e, %Y",
      formatter: function () {
        const points = this.points ?? [];
        let s = `<span style="color:#94a3b8;font-size:11px">${Highcharts.dateFormat(
          period === "daily" ? "%A, %b %e %H:%M" : period === "yearly" ? "%B %Y" : "%A, %b %e, %Y",
          this.x as number
        )}</span><br/>`;
        for (const pt of points) {
          s += `<span style="color:${pt.color}">●</span> <b style="color:#f1f5f9">${pt.series.name}:</b> <span style="color:#6366f1;font-weight:700">${formatPlayerCount(pt.y ?? 0)}</span><br/>`;
        }
        return s;
      },
    },
    plotOptions: {
      areaspline: {
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, "rgba(99,102,241,0.35)"],
            [0.5, "rgba(99,102,241,0.12)"],
            [1, "rgba(99,102,241,0.0)"],
          ],
        },
        lineWidth: 2.5,
        lineColor: "#6366f1",
        marker: {
          enabled: false,
          symbol: "circle",
          radius: 4,
          states: { hover: { enabled: true, radius: 5 } },
        },
        states: { hover: { lineWidth: 3 } },
      },
      spline: {
        lineWidth: 2,
        marker: { enabled: false, states: { hover: { enabled: true, radius: 4 } } },
      },
    },
    series: comparisonMode && comparisonSeries
      ? comparisonSeries.map((s, i) => ({
          type: "spline" as const,
          name: s.name,
          data: s.data.map((d) => [d.timestamp, d.players]),
          color: ["#6366f1", "#22d3ee", "#f59e0b", "#10b981"][i % 4],
        }))
      : [
          {
            type: "areaspline" as const,
            name: "Players",
            data: (historyData ?? []).map((d) => [d.timestamp, d.players]),
            color: "#6366f1",
          },
        ],
    responsive: {
      rules: [{
        condition: { maxWidth: 600 },
        chartOptions: {
          chart: { height: 240 },
          xAxis: { labels: { style: { fontSize: "10px" } } },
          yAxis: { labels: { style: { fontSize: "10px" } } },
        },
      }],
    },
    lang: {
      contextButtonTitle: "Export chart",
      downloadPNG: "Download PNG",
      downloadSVG: "Download SVG",
      printChart: "Print chart",
    },
  };

  return (
    <div className="w-full">
      {/* Period Selector */}
      {!comparisonMode && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs text-slate-400 font-mono">
              {currentPlayers > 0 ? `${formatPlayerCount(currentPlayers)} playing now` : "Live data"}
            </span>
          </div>
          <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700/40">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                  period === p.key
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="relative">
        {isLoading && !comparisonMode && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-lg z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Loading chart data...</span>
            </div>
          </div>
        )}
        <HighchartsReact
          ref={chartRef}
          highcharts={Highcharts}
          options={chartOptions}
          containerProps={{ className: "w-full" }}
        />
      </div>

      {/* Stats below chart */}
      {!comparisonMode && (
        <div className="flex gap-4 mt-3 pt-3 border-t border-slate-700/40">
          <div className="text-center">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Current</div>
            <div className="text-sm font-bold text-indigo-400 font-mono">{formatPlayerCount(currentPlayers)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500 uppercase tracking-wide">24h Peak</div>
            <div className="text-sm font-bold text-cyan-400 font-mono">{formatPlayerCount(peakPlayers)}</div>
          </div>
          <div className="text-center ml-auto">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Chart by</div>
            <div className="text-xs text-slate-400">SteamPulse</div>
          </div>
        </div>
      )}
    </div>
  );
}
