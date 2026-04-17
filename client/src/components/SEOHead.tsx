import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  jsonLd?: object;
}

const SITE_NAME = "SteamPulse";
const DEFAULT_TITLE = "SteamPulse | Live Steam Game Analytics and Player Statistics";
const DEFAULT_DESC =
  "Real-time Steam game player counts, top charts, trending games, historical analytics, genre explorer, and game comparison tools. The most comprehensive Steam analytics platform.";
const DEFAULT_IMAGE =
  "https://cdn.cloudflare.steamstatic.com/store/home/store_home_share.jpg";

export default function SEOHead({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  jsonLd,
}: SEOHeadProps) {
  // Use pipe separator instead of em dash — avoids rendering issues
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const canonicalUrl =
    url
      ? `${typeof window !== "undefined" ? window.location.origin : ""}${url}`
      : typeof window !== "undefined"
      ? window.location.href
      : "";

  useEffect(() => {
    // Update <title>
    document.title = fullTitle;

    const setMeta = (name: string, content: string, isProperty = false) => {
      const selector = isProperty
        ? `meta[property="${name}"]`
        : `meta[name="${name}"]`;
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (isProperty) el.setAttribute("property", name);
        else el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:image", image, true);
    setMeta("og:type", type, true);
    setMeta("og:site_name", SITE_NAME, true);
    if (canonicalUrl) setMeta("og:url", canonicalUrl, true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", image);

    // Canonical link
    if (canonicalUrl) {
      let link = document.querySelector(
        'link[rel="canonical"]'
      ) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonicalUrl);
    }

    // JSON-LD structured data — one script per page, replaced on navigation
    if (jsonLd) {
      let script = document.querySelector(
        'script[data-seo-jsonld]'
      ) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.setAttribute("type", "application/ld+json");
        script.setAttribute("data-seo-jsonld", "true");
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    }
  }, [fullTitle, description, image, canonicalUrl, type, jsonLd]);

  return null;
}
