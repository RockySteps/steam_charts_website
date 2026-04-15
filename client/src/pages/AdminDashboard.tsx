/**
 * AdminDashboard
 * Backend control panel for SteamPulse
 * Features: crawler control, progress monitoring, game management, site stats, crawl logs
 */

import { useState } from "react";
import { Link } from "wouter";
import {
  Play, Pause, Square, RefreshCw, Database, Activity,
  Users, Gamepad2, Clock, CheckCircle2, XCircle, AlertCircle,
  ChevronLeft, Search, BarChart2, Zap, List, FileText,
  TrendingUp, Server, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    running: { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: <Activity className="w-3 h-3" /> },
    paused: { color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", icon: <Pause className="w-3 h-3" /> },
    idle: { color: "text-slate-400 bg-slate-500/10 border-slate-500/30", icon: <Square className="w-3 h-3" /> },
    done: { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: <CheckCircle2 className="w-3 h-3" /> },
    failed: { color: "text-red-400 bg-red-500/10 border-red-500/30", icon: <XCircle className="w-3 h-3" /> },
    pending: { color: "text-blue-400 bg-blue-500/10 border-blue-500/30", icon: <Clock className="w-3 h-3" /> },
    processing: { color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30", icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
    completed: { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: <CheckCircle2 className="w-3 h-3" /> },
    partial: { color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", icon: <AlertCircle className="w-3 h-3" /> },
  };
  const style = map[status] ?? map.idle!;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border", style.color)}>
      {style.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

type AdminTab = "overview" | "games" | "logs";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const { user, loading: authLoading } = useAuth();

  // Auth guard: must be logged in and have admin role
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Server className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold text-white mb-2">Admin Access Required</h2>
          <p className="text-slate-400 text-sm mb-6">You must be logged in as an admin to access this page.</p>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-500">
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400 text-sm mb-6">Your account does not have admin privileges.</p>
          <Button asChild variant="outline" className="border-slate-600 text-slate-300 bg-transparent">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const [gameSearch, setGameSearch] = useState("");
  const [queueFilter, setQueueFilter] = useState<string>("all");
  const [queuePage, setQueuePage] = useState(0);
  const PAGE_SIZE = 50;

  // Queries
  const { data: siteStats, refetch: refetchStats } = trpc.admin.getSiteStats.useQuery(undefined, {
    refetchInterval: 10_000,
  });
  const { data: crawlerStatus, refetch: refetchCrawler } = trpc.admin.getCrawlerStatus.useQuery(undefined, {
    refetchInterval: 5_000,
  });
  const { data: crawlLogs } = trpc.admin.getCrawlLogs.useQuery({ limit: 20 }, {
    refetchInterval: 15_000,
  });
  const { data: queuePage_data, refetch: refetchQueue } = trpc.admin.getQueuePage.useQuery({
    limit: PAGE_SIZE,
    offset: queuePage * PAGE_SIZE,
    status: queueFilter === "all" ? undefined : queueFilter,
  }, { refetchInterval: 15_000 });

  // Mutations
  const startCrawler = trpc.admin.startCrawler.useMutation({
    onSuccess: () => { toast.success("Crawler started!"); refetchCrawler(); refetchStats(); },
    onError: () => toast.error("Failed to start crawler"),
  });
  const stopCrawler = trpc.admin.stopCrawler.useMutation({
    onSuccess: () => { toast.success("Crawler stopped."); refetchCrawler(); },
    onError: () => toast.error("Failed to stop crawler"),
  });
  const pauseCrawler = trpc.admin.pauseCrawler.useMutation({
    onSuccess: () => { toast.success("Crawler paused."); refetchCrawler(); },
    onError: () => toast.error("Failed to pause crawler"),
  });
  const resumeCrawler = trpc.admin.resumeCrawler.useMutation({
    onSuccess: () => { toast.success("Crawler resumed!"); refetchCrawler(); },
    onError: () => toast.error("Failed to resume crawler"),
  });
  const refreshGame = trpc.admin.refreshGame.useMutation({
    onSuccess: (_, vars) => { toast.success(`Game #${vars.appid} refresh queued.`); refetchQueue(); },
    onError: () => toast.error("Failed to refresh game"),
  });

  const isRunning = crawlerStatus?.isRunning ?? false;
  const isPaused = crawlerStatus?.isPaused ?? false;
  const progress = siteStats?.queueStats
    ? Math.round((siteStats.queueStats.done / Math.max(siteStats.queueStats.total, 1)) * 100)
    : 0;

  const filteredQueue = (queuePage_data ?? []).filter((g) => {
    if (!gameSearch) return true;
    return g.appid.toString().includes(gameSearch);
  });

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <BarChart2 className="w-4 h-4" /> },
    { key: "games", label: "Game Queue", icon: <List className="w-4 h-4" /> },
    { key: "logs", label: "Crawl Logs", icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <>
      <SEOHead title="Admin Dashboard — SteamPulse" description="SteamPulse admin control panel" url="/admin" />
      <div className="page-enter min-h-screen">
        {/* Header */}
        <div className="border-b border-[oklch(0.18_0.015_260)] bg-[oklch(0.09_0.01_260)]">
          <div className="container py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="sm" className="text-slate-500 hover:text-white">
                  <Link href="/">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back to Site
                  </Link>
                </Button>
                <div className="h-5 w-px bg-slate-700" />
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-400" />
                  <h1 className="font-display text-xl font-bold text-white">Admin Dashboard</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
                  isRunning && !isPaused
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                    : isPaused
                    ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
                    : "text-slate-400 bg-slate-500/10 border-slate-500/30"
                )}>
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isRunning && !isPaused ? "bg-emerald-400 animate-pulse" : isPaused ? "bg-yellow-400" : "bg-slate-500"
                  )} />
                  {isRunning && !isPaused ? "Crawler Running" : isPaused ? "Crawler Paused" : "Crawler Idle"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-6">
          {/* Crawler Control Panel */}
          <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Progress */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-400" />
                    Crawler Progress
                  </h2>
                  <span className="text-sm font-mono text-indigo-400 font-bold">{progress}%</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    <span className="text-emerald-400 font-semibold">{formatNumber(siteStats?.queueStats?.done)}</span> indexed
                    {" / "}
                    <span className="text-slate-300 font-semibold">{formatNumber(siteStats?.queueStats?.total)}</span> total
                    {siteStats?.queueStats?.failed ? (
                      <span className="ml-2 text-red-400">({formatNumber(siteStats.queueStats.failed)} failed)</span>
                    ) : null}
                  </span>
                  <span>
                    {crawlerStatus?.processedCount ? `${formatNumber(crawlerStatus.processedCount)} processed this session` : ""}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap gap-2">
                {!isRunning ? (
                  <Button
                    onClick={() => startCrawler.mutate()}
                    disabled={startCrawler.isPending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {startCrawler.isPending ? "Starting..." : "Start Crawler"}
                  </Button>
                ) : isPaused ? (
                  <Button
                    onClick={() => resumeCrawler.mutate()}
                    disabled={resumeCrawler.isPending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    onClick={() => pauseCrawler.mutate()}
                    disabled={pauseCrawler.isPending}
                    variant="outline"
                    className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 bg-transparent gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                )}
                {isRunning && (
                  <Button
                    onClick={() => stopCrawler.mutate()}
                    disabled={stopCrawler.isPending}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent gap-2"
                  >
                    <Square className="w-4 h-4" />
                    Stop
                  </Button>
                )}
                <Button
                  onClick={() => { refetchStats(); refetchCrawler(); }}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-400 hover:text-white bg-transparent gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Games Indexed", value: formatNumber(siteStats?.totalGames), icon: Database, color: "text-indigo-400", bg: "bg-indigo-500/10" },
              { label: "Players Online", value: formatNumber(siteStats?.totalPlayers), icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Processed Today", value: formatNumber(siteStats?.processedToday), icon: Activity, color: "text-cyan-400", bg: "bg-cyan-500/10" },
              { label: "Queue Remaining", value: formatNumber((siteStats?.queueStats?.total ?? 0) - (siteStats?.queueStats?.done ?? 0)), icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bg)}>
                    <Icon className={cn("w-4 h-4", color)} />
                  </div>
                  <span className="text-xs text-slate-500 uppercase tracking-wide font-mono">{label}</span>
                </div>
                <div className={cn("text-2xl font-display font-bold tabular-nums", color)}>{value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700/40 mb-6 w-fit">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200",
                  activeTab === tab.key
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Games */}
              <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-5">
                <h3 className="font-display text-base font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  Top Games Right Now
                </h3>
                <div className="space-y-2">
                  {(siteStats?.topGames ?? []).map((g, i) => (
                    <div key={g.appid} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/40 transition-colors">
                      <span className="text-xs font-mono text-slate-500 w-4 shrink-0">{i + 1}</span>
                      <img
                        src={g.headerImage ?? `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/capsule_231x87.jpg`}
                        alt={g.name ?? ""}
                        className="w-14 h-8 rounded object-cover shrink-0"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{g.name ?? `App ${g.appid}`}</p>
                        <p className="text-xs text-indigo-400 font-mono">{formatNumber(g.ccu)} players</p>
                      </div>
                      <Link href={`/game/${g.appid}`}>
                        <ArrowUpRight className="w-4 h-4 text-slate-500 hover:text-white transition-colors" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Crawler Info */}
              <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] p-5">
                <h3 className="font-display text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  Crawler Status
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Status", value: <StatusBadge status={isRunning ? (isPaused ? "paused" : "running") : "idle"} /> },
                    { label: "Current Job ID", value: <span className="font-mono text-xs text-slate-300">{crawlerStatus?.currentJobId ?? "—"}</span> },
                    { label: "Processed (session)", value: <span className="font-mono text-slate-200">{formatNumber(crawlerStatus?.processedCount)}</span> },
                    { label: "Failed (session)", value: <span className={cn("font-mono", (crawlerStatus?.failedCount ?? 0) > 0 ? "text-red-400" : "text-slate-400")}>{formatNumber(crawlerStatus?.failedCount)}</span> },
                    { label: "Last Crawl", value: <span className="text-xs text-slate-400">{formatDate(siteStats?.lastCrawlAt)}</span> },
                    { label: "Last Activity", value: <span className="text-xs text-slate-400">{formatDate(crawlerStatus?.lastActivity)}</span> },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-800/60 last:border-0">
                      <span className="text-xs text-slate-500 uppercase tracking-wide font-mono">{label}</span>
                      {value}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Game Queue Tab */}
          {activeTab === "games" && (
            <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] overflow-hidden">
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-700/40 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by name or App ID..."
                    value={gameSearch}
                    onChange={(e) => setGameSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-slate-700/40 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700/40">
                  {["all", "done", "pending", "failed"].map((f) => (
                    <button
                      key={f}
                      onClick={() => { setQueueFilter(f); setQueuePage(0); }}
                      className={cn(
                        "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                        queueFilter === f ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/40 bg-slate-800/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">App ID</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Priority</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Crawled</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Retries</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueue.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                          <Gamepad2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                          No games found
                        </td>
                      </tr>
                    ) : (
                      filteredQueue.map((g, idx) => (
                        <tr key={g.appid} className={cn(
                          "border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors",
                          idx % 2 === 0 ? "" : "bg-slate-800/10"
                        )}>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs text-slate-400">{g.appid}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <img
                                src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/capsule_231x87.jpg`}
                                alt=""
                                className="w-10 h-6 rounded object-cover shrink-0"
                                loading="lazy"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                              <span className="text-slate-200 text-xs font-medium truncate max-w-[180px]">
                                App #{g.appid}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={g.status ?? "pending"} />
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={cn(
                              "font-mono text-xs font-semibold",
                              (g.priority ?? 0) >= 100 ? "text-yellow-400" : "text-slate-400"
                            )}>
                              {g.priority ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-xs text-slate-500">{formatDate(g.lastCrawledAt)}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={cn(
                              "font-mono text-xs",
                              (g.retryCount ?? 0) > 2 ? "text-red-400" : "text-slate-400"
                            )}>
                              {g.retryCount ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => refreshGame.mutate({ appid: g.appid })}
                                disabled={refreshGame.isPending}
                                className="p-1.5 rounded-md text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                                title="Force refresh"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <Link href={`/game/${g.appid}`}>
                                <button className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors" title="View game">
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-700/40 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Page {queuePage + 1} · Showing {filteredQueue.length} results
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQueuePage((p) => Math.max(0, p - 1))}
                    disabled={queuePage === 0}
                    className="border-slate-600 text-slate-400 bg-transparent hover:text-white text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setQueuePage((p) => p + 1); refetchQueue(); }}
                    disabled={(queuePage_data?.length ?? 0) < PAGE_SIZE}
                    className="border-slate-600 text-slate-400 bg-transparent hover:text-white text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Crawl Logs Tab */}
          {activeTab === "logs" && (
            <div className="rounded-xl border border-[oklch(0.18_0.015_260)] bg-[oklch(0.10_0.012_260)] overflow-hidden">
              <div className="p-4 border-b border-slate-700/40">
                <h3 className="font-display text-base font-bold text-white">Crawl Job History</h3>
                <p className="text-xs text-slate-500 mt-0.5">Last 20 crawl jobs</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/40 bg-slate-800/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Job ID</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Trigger</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Processed</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Failed</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Started</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(crawlLogs ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                          No crawl jobs yet
                        </td>
                      </tr>
                    ) : (
                      (crawlLogs ?? []).map((log, idx) => (
                        <tr key={log.id} className={cn(
                          "border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors",
                          idx % 2 === 0 ? "" : "bg-slate-800/10"
                        )}>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs text-slate-400">{log.id}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs text-slate-300 capitalize">{log.triggerType ?? "manual"}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={log.status ?? "pending"} />
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="font-mono text-xs text-emerald-400">{formatNumber(log.successCount)}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={cn("font-mono text-xs", (log.failedCount ?? 0) > 0 ? "text-red-400" : "text-slate-500")}>
                              {formatNumber(log.failedCount)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-xs text-slate-400">{formatDate(log.startedAt)}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-xs text-slate-400">{formatDate(log.completedAt)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
