import { useState } from "react";

interface SteamImageProps {
  appid: number;
  name: string;
  headerImage?: string | null;
  className?: string;
  loading?: "lazy" | "eager";
}

/**
 * Tries multiple Steam CDN URLs in order, then shows a styled placeholder.
 * Prevents infinite 404 loops by tracking which URLs have already failed.
 */
export default function SteamImage({
  appid,
  name,
  headerImage,
  className = "",
  loading = "lazy",
}: SteamImageProps) {
  // Build a deduplicated list of URLs to try
  const candidates: string[] = [];
  if (headerImage) candidates.push(headerImage);
  // Always try both CDN patterns as fallbacks
  const cdnUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
  const akamaiUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;
  if (!candidates.includes(cdnUrl)) candidates.push(cdnUrl);
  if (!candidates.includes(akamaiUrl)) candidates.push(akamaiUrl);

  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed) {
    // Styled placeholder — no more network requests
    return (
      <div
        className={`${className} flex items-center justify-center bg-[oklch(0.13_0.015_260)] text-[oklch(0.35_0.02_260)]`}
        aria-label={name}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-8 h-8 opacity-40"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={candidates[idx]}
      alt={name}
      className={className}
      loading={loading}
      onError={() => {
        const next = idx + 1;
        if (next < candidates.length) {
          setIdx(next);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
