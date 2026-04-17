/**
 * HighchartsPlayerChart
 * Premium dark-themed interactive player count chart using Highcharts.
 * Features:
 * - Dual series: Daily Avg. Players (green) + Daily Peak Players (blue)
 * - Zoom buttons: 7D, 1M, 3M, 6M, 1Y, All
 * - Navigator (scrollbar) at the bottom for panning
 * - Export: PNG, JPEG, SVG, Print
 * - Matches the existing dark premium design system
 */

import Highcharts from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

// Initialize Highcharts modules using dynamic import with type assertion
void Promise.all([
  import("highcharts/modules/exporting"),
  import("highcharts/modules/export-data"),
  import("highcharts/modules/offline-exporting"),
  // NOTE: accessibility module intentionally excluded — it crashes on Highcharts v12
  // with "Cannot read properties of undefined (reading 'enabled')" in production builds.
]).then(([exp, expData, offline]) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hc = Highcharts as any;
  if (!hc._modulesLoaded) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (exp as any).default(Highcharts);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (expData as any).default(Highcharts);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (offline as any).default(Highcharts);
    hc._modulesLoaded = true;
  }
});

// Apply global dark theme once
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hcAny = Highcharts as any;
if (!hcAny._themeApplied) {
  Highcharts.setOptions({
    chart: {
      backgroundColor: "transparent",
      style: { fontFamily: "'Inter', 'Rajdhani', sans-serif" },
    },
    title: { style: { color: "#e2e8f0" } },
    subtitle: { style: { color: "#94a3b8" } },
    xAxis: {
      labels: { style: { color: "#94a3b8", fontSize: "11px" } },
      lineColor: "rgba(148,163,184,0.15)",
      tickColor: "rgba(148,163,184,0.15)",
      gridLineColor: "rgba(148,163,184,0.06)",
    },
    yAxis: {
      labels: { style: { color: "#94a3b8", fontSize: "11px" } },
      gridLineColor: "rgba(148,163,184,0.08)",
      title: { style: { color: "#64748b" } },
    },
    legend: {
      itemStyle: { color: "#94a3b8", fontWeight: "normal" },
      itemHoverStyle: { color: "#e2e8f0" },
    },
    tooltip: {
      backgroundColor: "rgba(15,17,26,0.95)",
      borderColor: "rgba(99,102,241,0.4)",
      borderRadius: 8,
      style: { color: "#e2e8f0", fontSize: "13px" },
      shadow: { color: "rgba(99,102,241,0.15)", offsetX: 0, offsetY: 4, opacity: 0.8, width: 16 },
    },
    credits: { enabled: false },
    exporting: {
      buttons: {
        contextButton: {
          symbolStroke: "#94a3b8",
          theme: { fill: "rgba(30,32,48,0.9)", stroke: "rgba(99,102,241,0.3)" },
        },
      },
    },
  });
  hcAny._themeApplied = true;
}

type Period = "daily" | "weekly" | "monthly" | "yearly" | "all";

interface PeriodBtn {
  key: Period;
  label: string;
}

const PERIOD_BUTTONS: PeriodBtn[] = [
  { key: "daily",   label: "7D" },
  { key: "weekly",  label: "1M" },
  { key: "monthly", label: "3M" },
  { key: "yearly",  label: "1Y" },
  { key: "all",     label: "All" },
];

interface Props {
  appid: number;
  gameName?: string;
}

export default function HighchartsPlayerChart({ appid, gameName }: Props) {
  const [period, setPeriod] = useState<Period>("yearly");
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  const { data, isLoading } = trpc.games.getPlayerHistory.useQuery(
    { appid, period },
    { staleTime: 5 * 60 * 1000 }
  );

  // Build two series from the data
  const avgSeries: [number, number][] = (data ?? []).map(p => [p.timestamp, p.players]);
  const peakSeries: [number, number][] = (data ?? []).map(p => [p.timestamp, p.peak ?? p.players]);

  const options: Highcharts.Options = {
    chart: {
      type: "areaspline",
      backgroundColor: "transparent",
      height: 420,
      animation: { duration: 400 },
      marginTop: 20,
      marginBottom: 80,
      zooming: { type: "x" },
    },

    title: { text: undefined },

    xAxis: {
      type: "datetime",
      crosshair: {
        color: "rgba(99,102,241,0.35)",
        width: 1,
        dashStyle: "Dash",
      },
      labels: {
        style: { color: "#94a3b8", fontSize: "11px" },
        formatter: function () {
          const d = new Date(this.value as number);
          if (period === "daily") {
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }
          return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        },
      },
      lineColor: "rgba(148,163,184,0.12)",
      tickColor: "rgba(148,163,184,0.12)",
      gridLineColor: "rgba(148,163,184,0.05)",
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
      formatter: function () {
        const d = new Date(this.x as number);
        const dateStr = d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
        const fmt = (n: number) => n >= 1_000_000
          ? `${(n / 1_000_000).toFixed(2)}M`
          : n >= 1_000
          ? `${(n / 1_000).toFixed(1)}K`
          : String(n);

        let rows = "";
        (this.points ?? []).forEach(pt => {
          const color = pt.series.color as string;
          rows += `<div style="display:flex;align-items:center;gap:8px;margin-top:4px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color}"></span>
            <span style="color:#94a3b8;font-size:12px">${pt.series.name}:</span>
            <span style="color:#e2e8f0;font-size:13px;font-weight:600;font-family:monospace">${fmt(pt.y as number)}</span>
          </div>`;
        });

        return `<div style="padding:8px 12px;min-width:200px">
          <div style="color:#64748b;font-size:11px;margin-bottom:4px">${dateStr}</div>
          ${rows}
        </div>`;
      },
    },

    legend: {
      enabled: true,
      align: "center",
      verticalAlign: "bottom",
      itemStyle: { color: "#94a3b8", fontWeight: "normal", fontSize: "12px" },
      itemHoverStyle: { color: "#e2e8f0" },
      symbolRadius: 4,
    },

    // Navigator (scrollbar at the bottom)
    navigator: {
      enabled: true,
      height: 40,
      margin: 10,
      outlineColor: "rgba(99,102,241,0.25)",
      outlineWidth: 1,
      handles: {
        backgroundColor: "rgba(99,102,241,0.7)",
        borderColor: "rgba(99,102,241,0.9)",
      },
      xAxis: {
        labels: {
          style: { color: "#64748b", fontSize: "10px" },
        },
        gridLineColor: "rgba(148,163,184,0.05)",
      },
      series: {
        type: "areaspline",
        color: "rgba(99,102,241,0.5)",
        fillOpacity: 0.15,
        lineWidth: 1,
      },
      maskFill: "rgba(99,102,241,0.08)",
    },

    // Scrollbar
    scrollbar: {
      enabled: false,
    },

    // Range selector (built-in zoom buttons) — disabled, we use custom buttons
    rangeSelector: {
      enabled: false,
    },

    plotOptions: {
      areaspline: {
        lineWidth: 2,
        marker: { enabled: false, states: { hover: { enabled: true, radius: 4 } } },
        states: { hover: { lineWidth: 2.5 } },
        fillOpacity: 0.12,
      },
    },

    series: [
      {
        type: "areaspline",
        name: "Daily Avg. Players",
        data: avgSeries,
        color: "oklch(0.72 0.2 145)", // green
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, "rgba(74,222,128,0.25)"],
            [1, "rgba(74,222,128,0.01)"],
          ],
        },
        zIndex: 2,
      },
      {
        type: "areaspline",
        name: "Daily Peak Players",
        data: peakSeries,
        color: "oklch(0.72 0.18 250)", // blue
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, "rgba(99,102,241,0.18)"],
            [1, "rgba(99,102,241,0.01)"],
          ],
        },
        zIndex: 1,
      },
    ],

    exporting: {
      enabled: true,
      filename: gameName ? `${gameName.replace(/[^a-z0-9]/gi, "_")}_player_chart` : "player_chart",
      sourceWidth: 1200,
      sourceHeight: 500,
      scale: 2,
      menuItemDefinitions: {
        downloadPNG: { text: "Download PNG" },
        downloadJPEG: { text: "Download JPEG" },
        downloadSVG: { text: "Download SVG" },
        printChart: { text: "Print Chart" },
      },
      buttons: {
        contextButton: {
          menuItems: ["downloadPNG", "downloadJPEG", "downloadSVG", "separator", "printChart"],
          symbolStroke: "#94a3b8",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          theme: {
            fill: "rgba(20,22,36,0.95)",
            stroke: "rgba(99,102,241,0.3)",
          } as any,
        },
      },
    },

    accessibility: { enabled: false },
  };

  return (
    <div className="w-full">
      {/* Period selector + live indicator */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs text-slate-400 font-mono">LIVE</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700/40">
          {PERIOD_BUTTONS.map(btn => (
            <button
              key={btn.key}
              onClick={() => setPeriod(btn.key)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                period === btn.key
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative rounded-xl overflow-hidden bg-slate-900/40 border border-slate-700/30 p-4">
        {isLoading ? (
          <div className="h-[420px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-500 text-sm">Loading chart data...</span>
            </div>
          </div>
        ) : (
          <HighchartsReact
            highcharts={Highcharts}
            constructorType="stockChart"
            options={options}
            ref={chartRef}
          />
        )}
      </div>
    </div>
  );
}
