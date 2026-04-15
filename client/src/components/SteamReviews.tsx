/**
 * SteamReviews
 * Displays official Steam user reviews fetched from the Steam Reviews API
 * Shows review summary (score, positive %) and individual review cards
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ThumbsUp, ThumbsDown, Clock, Star, Filter } from "lucide-react";

interface Props {
  appid: number;
  reviewScore?: number;
  reviewScoreDesc?: string;
  totalReviews?: number;
  positiveReviews?: number;
}

type ReviewFilter = "all" | "positive" | "negative" | "recent";

const FILTER_OPTIONS: { key: ReviewFilter; label: string }[] = [
  { key: "all", label: "All Reviews" },
  { key: "positive", label: "Positive" },
  { key: "negative", label: "Negative" },
  { key: "recent", label: "Recent" },
];

function getScoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-yellow-400";
  return "text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 8) return "bg-emerald-500/10 border-emerald-500/30";
  if (score >= 6) return "bg-yellow-500/10 border-yellow-500/30";
  return "bg-red-500/10 border-red-500/30";
}

function getPositiveBarWidth(pct: number): string {
  return `${Math.max(2, Math.min(100, pct))}%`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function truncateReview(text: string, maxLen = 300): { text: string; truncated: boolean } {
  if (text.length <= maxLen) return { text, truncated: false };
  return { text: text.slice(0, maxLen).trimEnd() + "...", truncated: true };
}

export default function SteamReviews({ appid, reviewScore = 0, reviewScoreDesc = "", totalReviews = 0, positiveReviews = 0 }: Props) {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = trpc.games.getReviews.useQuery(
    { appid, filter, numPerPage: 10 },
    { staleTime: 5 * 60 * 1000 }
  );

  const summary = data?.summary;
  const reviews = data?.reviews ?? [];

  // Use DB data as fallback for summary
  const displayScore = summary?.reviewScore ?? reviewScore;
  const displayDesc = summary?.reviewScoreDesc ?? reviewScoreDesc;
  const displayTotal = summary?.totalReviews ?? totalReviews;
  const displayPositive = summary?.totalPositive ?? positiveReviews;
  const displayPct = summary?.positivePercent ??
    (displayTotal > 0 ? Math.round((displayPositive / displayTotal) * 100) : 0);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* Review Summary Card */}
      {(displayTotal > 0 || displayDesc) && (
        <div className={`rounded-xl border p-4 ${getScoreBg(displayScore)}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Score Badge */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 text-2xl font-bold font-display ${getScoreColor(displayScore)}`}>
                <Star className="w-5 h-5 fill-current" />
                {displayDesc || "No Reviews"}
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 space-y-2">
              {displayTotal > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      <span className="text-emerald-400 font-semibold">{displayPct}%</span> of{" "}
                      <span className="text-slate-200 font-semibold">{displayTotal.toLocaleString()}</span> reviews are positive
                    </span>
                    <div className="flex gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-emerald-400" />
                        {displayPositive.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3 text-red-400" />
                        {(displayTotal - displayPositive).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: getPositiveBarWidth(displayPct) }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700/40">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                filter === opt.key
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-4 space-y-2 animate-pulse">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-slate-700/60 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 bg-slate-700/60 rounded" />
                  <div className="h-3 w-16 bg-slate-700/60 rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-slate-800/60 rounded" />
              <div className="h-3 w-3/4 bg-slate-800/60 rounded" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-8 text-center">
          <ThumbsUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No reviews found for this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const { text, truncated } = truncateReview(review.review);
            const isExpanded = expandedIds.has(review.id);
            return (
              <div
                key={review.id}
                className={`rounded-xl border bg-slate-900/60 p-4 transition-colors hover:border-slate-600/60 ${
                  review.isPositive ? "border-slate-700/40" : "border-slate-700/30"
                }`}
              >
                {/* Review Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    review.isPositive ? "bg-emerald-500/15 border border-emerald-500/30" : "bg-red-500/15 border border-red-500/30"
                  }`}>
                    {review.isPositive
                      ? <ThumbsUp className="w-4 h-4 text-emerald-400" />
                      : <ThumbsDown className="w-4 h-4 text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-semibold ${review.isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        {review.isPositive ? "Recommended" : "Not Recommended"}
                      </span>
                      {review.steamPurchase && (
                        <span className="text-xs text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">Steam Purchase</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {review.authorPlaytime.toLocaleString()}h on record
                      </span>
                      <span>{formatDate(review.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {isExpanded ? review.review : text}
                </p>
                {truncated && (
                  <button
                    onClick={() => toggleExpand(review.id)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 mt-1.5 transition-colors"
                  >
                    {isExpanded ? "Show less" : "Read more"}
                  </button>
                )}

                {/* Review Footer */}
                {review.votesUp > 0 && (
                  <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-800/60">
                    <ThumbsUp className="w-3 h-3 text-slate-500" />
                    <span className="text-xs text-slate-500">
                      {review.votesUp.toLocaleString()} {review.votesUp === 1 ? "person" : "people"} found this helpful
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Attribution */}
      <p className="text-xs text-slate-600 text-center">
        Reviews sourced from the official Steam API · <a href={`https://store.steampowered.com/app/${appid}/#app_reviews_hash`} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-400">View all on Steam</a>
      </p>
    </div>
  );
}
