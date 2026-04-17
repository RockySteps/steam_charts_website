import { Link } from "wouter";
import { Gamepad2, ExternalLink, Github, Twitter, Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-[oklch(0.16_0.015_260)] bg-[oklch(0.07_0.01_260)] mt-16">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[oklch(0.62_0.22_250)] to-[oklch(0.7_0.18_195)] flex items-center justify-center">
                <Gamepad2 className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-display text-lg font-bold text-white">
                STEAM<span className="text-[oklch(0.62_0.22_250)]">PULSE</span>
              </span>
            </Link>
            <p className="text-sm text-[oklch(0.5_0.02_260)] leading-relaxed">
              Real-time Steam game analytics and player statistics for the gaming community.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 tracking-wide uppercase font-display">Analytics</h4>
            <ul className="space-y-2">
              {[
                { href: "/charts", label: "Top Charts" },
                { href: "/trending", label: "Trending" },
                { href: "/genres", label: "Genre Explorer" },
                { href: "/compare", label: "Game Comparison" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-[oklch(0.5_0.02_260)] hover:text-[oklch(0.62_0.22_250)] transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Data */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 tracking-wide uppercase font-display">Data</h4>
            <ul className="space-y-2">
              {[
                { href: "/trending#records", label: "All-Time Records" },
                { href: "/trending#gainers", label: "Top Gainers" },
                { href: "/trending#losers", label: "Top Losers" },
                { href: "/search", label: "Game Search" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-[oklch(0.5_0.02_260)] hover:text-[oklch(0.62_0.22_250)] transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* External */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 tracking-wide uppercase font-display">Resources</h4>
            <ul className="space-y-2">
              {[
                { href: "https://store.steampowered.com", label: "Steam Store", external: true },
                { href: "https://steamspy.com", label: "SteamSpy", external: true },
                { href: "https://developer.valvesoftware.com/wiki/Steam_Web_API", label: "Steam API", external: true },
                { href: "/sitemap", label: "Site Map", external: false },
                { href: "/sitemap.xml", label: "XML Sitemap", external: true },
              ].map(({ href, label, external }) => (
                <li key={href}>
                  <a
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="flex items-center gap-1.5 text-sm text-[oklch(0.5_0.02_260)] hover:text-[oklch(0.62_0.22_250)] transition-colors"
                  >
                    {label}
                    {external && <ExternalLink className="w-3 h-3" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-[oklch(0.14_0.015_260)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[oklch(0.38_0.02_260)]">
            © 2026 SteamPulse. Data provided by Steam Web API & SteamSpy. Not affiliated with Valve Corporation.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-[oklch(0.38_0.02_260)]">
              <Zap className="w-3 h-3 text-[oklch(0.72_0.2_145)]" />
              Live data · Updates hourly
            </div>
            <Link href="/sitemap" className="text-xs text-[oklch(0.38_0.02_260)] hover:text-[oklch(0.62_0.22_250)] transition-colors">Sitemap</Link>
            <div className="flex items-center gap-2">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[oklch(0.38_0.02_260)] hover:text-[oklch(0.62_0.22_250)] transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-[oklch(0.38_0.02_260)] hover:text-[oklch(0.62_0.22_250)] transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
