/**
 * SEOHead — Comprehensive SEO head management component.
 *
 * Handles:
 * - <title> with site name suffix
 * - Meta description, OpenGraph, Twitter Card
 * - Canonical URL
 * - Multiple JSON-LD structured data blocks (VideoGame, BreadcrumbList, ItemList, WebSite, etc.)
 * - Pagination rel=prev/next link tags
 * - robots meta (noindex support)
 */

import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  /** Single JSON-LD schema object OR array of schema objects */
  jsonLd?: object | object[];
  /** For pagination: URL of the previous page */
  prevUrl?: string;
  /** For pagination: URL of the next page */
  nextUrl?: string;
  /** Set to true to add noindex,nofollow */
  noIndex?: boolean;
}

const SITE_NAME = "SteamPulse";
const SITE_URL = "https://steampulse.io";
const DEFAULT_TITLE = "SteamPulse | Live Steam Game Analytics and Player Statistics";
const DEFAULT_DESC =
  "Real-time Steam game player counts, top charts, trending games, historical analytics, genre explorer, and game comparison tools. The most comprehensive Steam analytics platform.";
const DEFAULT_IMAGE =
  "https://cdn.cloudflare.steamstatic.com/store/home/store_home_share.jpg";

/**
 * Global WebSite schema with SiteLinksSearchBox — injected once into <head>.
 * This tells Google about the search functionality.
 */
const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": SITE_NAME,
  "url": SITE_URL,
  "description": DEFAULT_DESC,
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${SITE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

function injectWebsiteSchema() {
  if (document.querySelector('script[data-seo-website]')) return;
  const script = document.createElement("script");
  script.setAttribute("type", "application/ld+json");
  script.setAttribute("data-seo-website", "true");
  script.textContent = JSON.stringify(WEBSITE_SCHEMA);
  document.head.appendChild(script);
}

export default function SEOHead({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  jsonLd,
  prevUrl,
  nextUrl,
  noIndex = false,
}: SEOHeadProps) {
  // Build full title — avoid double-appending site name
  const fullTitle = title
    ? title.includes(SITE_NAME)
      ? title
      : `${title} | ${SITE_NAME}`
    : DEFAULT_TITLE;

  const origin = typeof window !== "undefined" ? window.location.origin : SITE_URL;
  const canonicalUrl = url ? `${origin}${url}` : (typeof window !== "undefined" ? window.location.href : "");

  useEffect(() => {
    // 1. Inject WebSite schema once
    injectWebsiteSchema();

    // 2. Update <title>
    document.title = fullTitle;

    // 3. Meta helpers
    const setMeta = (name: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (isProperty) el.setAttribute("property", name);
        else el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // 4. Standard meta
    setMeta("description", description);
    if (noIndex) {
      setMeta("robots", "noindex,nofollow");
    } else {
      setMeta("robots", "index,follow");
    }

    // 5. OpenGraph
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:image", image, true);
    setMeta("og:type", type, true);
    setMeta("og:site_name", SITE_NAME, true);
    if (canonicalUrl) setMeta("og:url", canonicalUrl, true);

    // 6. Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", image);

    // 7. Canonical link
    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonicalUrl);
    }

    // 8. Pagination rel=prev/next
    const setPaginationLink = (rel: "prev" | "next", href: string | undefined) => {
      let existing = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (href) {
        const fullHref = href.startsWith("http") ? href : `${origin}${href}`;
        if (!existing) {
          existing = document.createElement("link");
          existing.setAttribute("rel", rel);
          document.head.appendChild(existing);
        }
        existing.setAttribute("href", fullHref);
      } else if (existing) {
        existing.remove();
      }
    };
    setPaginationLink("prev", prevUrl);
    setPaginationLink("next", nextUrl);

    // 9. JSON-LD structured data — supports single object or array
    // Remove all previous page-level JSON-LD scripts
    document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove());

    if (jsonLd) {
      const schemas = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      schemas.forEach((schema, idx) => {
        const script = document.createElement("script");
        script.setAttribute("type", "application/ld+json");
        script.setAttribute("data-seo-jsonld", String(idx));
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
      });
    }
  }, [fullTitle, description, image, canonicalUrl, type, jsonLd, prevUrl, nextUrl, noIndex, origin]);

  return null;
}
