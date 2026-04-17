import { Link } from "wouter";
import { Users, TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatNumber, formatPrice } from "@/lib/utils";
import SteamImage from "./SteamImage";

interface GameCardProps {
  appid: number;
  name: string;
  headerImage?: string | null;
  ccu?: number | null;
  peakPlayersAllTime?: number | null;
  priceUsd?: number | null;
  isFree?: number | boolean | null;
  discountPercent?: number | null;
  genre?: string | null;
  reviewScoreDesc?: string | null;
  rank?: number;
  change?: number;
  className?: string;
  variant?: "default" | "compact" | "featured";
}

export default function GameCard({
  appid,
  name,
  headerImage,
  ccu,
  peakPlayersAllTime,
  priceUsd,
  isFree,
  discountPercent,
  genre,
  reviewScoreDesc,
  rank,
  change,
  className,
  variant = "default",
}: GameCardProps) {
  if (variant === "compact") {
    return (
      <Link href={`/game/${appid}`}>
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg bg-[oklch(0.11_0.015_260)] border border-[oklch(0.18_0.015_260)] card-hover cursor-pointer",
          className
        )}>
          {rank && (
            <span className="rank-badge text-[oklch(0.45_0.02_260)] w-6 text-center shrink-0">{rank}</span>
          )}
          <SteamImage
            appid={appid}
            name={name}
            headerImage={headerImage}
            className="w-16 h-9 rounded object-cover shrink-0 bg-[oklch(0.14_0.015_260)]"
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{name}</p>
            {genre && <p className="text-xs text-[oklch(0.45_0.02_260)] truncate">{genre.split(",")[0]}</p>}
          </div>
          {ccu != null && (
            <div className="text-right shrink-0">
              <p className="text-sm font-mono font-semibold text-[oklch(0.62_0.22_250)]">{formatNumber(ccu)}</p>
              <p className="text-xs text-[oklch(0.45_0.02_260)]">playing</p>
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/game/${appid}`}>
      <div className={cn(
        "group relative rounded-xl overflow-hidden bg-[oklch(0.11_0.015_260)] border border-[oklch(0.18_0.015_260)] card-hover cursor-pointer",
        className
      )}>
        {/* Image */}
        <div className="relative aspect-[460/215] overflow-hidden">
          <SteamImage
            appid={appid}
            name={name}
            headerImage={headerImage}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.01_260)] via-transparent to-transparent opacity-80" />

          {/* Rank badge */}
          {rank && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[oklch(0.08_0.01_260/0.85)] border border-[oklch(0.25_0.02_260/0.5)]">
              <span className="rank-badge text-[oklch(0.62_0.22_250)]">#{rank}</span>
            </div>
          )}

          {/* Discount badge */}
          {discountPercent && discountPercent > 0 && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[oklch(0.72_0.2_145)] text-white text-xs font-bold">
              -{discountPercent}%
            </div>
          )}

          {/* Live player count overlay */}
          {ccu != null && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
              <div className="pulse-dot" />
              <span className="text-xs font-mono font-semibold text-white drop-shadow-lg">
                {formatNumber(ccu)} playing
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="font-display text-base font-semibold text-white truncate mb-1">{name}</h3>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-xs text-[oklch(0.5_0.02_260)]">
              {peakPlayersAllTime != null && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Peak: {formatNumber(peakPlayersAllTime)}
                </span>
              )}
              {change != null && (
                <span className={cn(
                  "flex items-center gap-0.5 font-medium",
                  change > 0 ? "text-[oklch(0.72_0.2_145)]" : change < 0 ? "text-[oklch(0.62_0.22_25)]" : "text-[oklch(0.5_0.02_260)]"
                )}>
                  {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                  {change > 0 ? "+" : ""}{change.toFixed(1)}%
                </span>
              )}
            </div>

            <div className="text-right">
              {isFree ? (
                <span className="text-xs font-semibold text-[oklch(0.72_0.2_145)]">Free</span>
              ) : priceUsd != null ? (
                <span className="text-xs font-semibold text-white">{formatPrice(priceUsd)}</span>
              ) : null}
            </div>
          </div>

          {genre && (
            <div className="mt-2 flex flex-wrap gap-1">
              {genre.split(",").slice(0, 2).map((g) => (
                <span key={g} className="px-1.5 py-0.5 rounded text-[10px] bg-[oklch(0.16_0.02_260)] text-[oklch(0.5_0.02_260)]">
                  {g.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
