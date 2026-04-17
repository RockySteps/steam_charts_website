import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, TrendingUp, BarChart2, Gamepad2, GitCompare, Layers, Flame, Radio, ShoppingBag, Sparkles, CalendarClock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home", icon: Flame },
  { href: "/charts", label: "Top Charts", icon: BarChart2 },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/genres", label: "Genres", icon: Layers },
  { href: "/compare", label: "Compare", icon: GitCompare },
];

const steamLinks = [
  { href: "/live", label: "Live Stats", icon: Radio, desc: "Worldwide concurrent players" },
  { href: "/top-sellers", label: "Top Sellers", icon: ShoppingBag, desc: "Best-selling games on Steam" },
  { href: "/new-releases", label: "New Releases", icon: Sparkles, desc: "Latest games on Steam" },
  { href: "/upcoming", label: "Upcoming Games", icon: CalendarClock, desc: "Coming soon to Steam" },
];

function SteamDropdown({ location }: { location: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = steamLinks.some(l => location === l.href || location.startsWith(l.href + "/"));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "text-[oklch(0.62_0.22_250)] bg-[oklch(0.62_0.22_250/0.1)]"
            : "text-[oklch(0.65_0.02_260)] hover:text-white hover:bg-[oklch(0.16_0.02_260)]"
        )}
      >
        <Radio className="w-3.5 h-3.5" />
        Steam Live
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 rounded-xl border border-[oklch(0.22_0.015_260)] bg-[oklch(0.10_0.012_260/0.98)] backdrop-blur-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
          {steamLinks.map(({ href, label, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-all duration-150 group",
                location === href || location.startsWith(href + "/")
                  ? "bg-[oklch(0.62_0.22_250/0.1)] text-[oklch(0.62_0.22_250)]"
                  : "text-[oklch(0.65_0.02_260)] hover:bg-[oklch(0.16_0.02_260)] hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-[oklch(0.45_0.02_260)] group-hover:text-[oklch(0.55_0.02_260)]">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    // If query is a pure number, treat it as an App ID and navigate directly
    if (/^\d+$/.test(q)) {
      navigate(`/game/${q}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
    setSearchQuery("");
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[oklch(0.08_0.01_260/0.95)] backdrop-blur-xl border-b border-[oklch(0.2_0.015_260)]"
          : "bg-transparent"
      )}
    >
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[oklch(0.62_0.22_250)] to-[oklch(0.7_0.18_195)] flex items-center justify-center shadow-lg group-hover:shadow-[0_0_16px_oklch(0.62_0.22_250/0.5)] transition-shadow duration-300">
                <Gamepad2 className="w-4.5 h-4.5 text-white" />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold tracking-wide text-white">
                STEAM<span className="text-[oklch(0.62_0.22_250)]">PULSE</span>
              </span>
              <span className="text-[10px] text-[oklch(0.55_0.02_260)] tracking-widest uppercase font-mono">
                Live Analytics
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  location === href
                    ? "text-[oklch(0.62_0.22_250)] bg-[oklch(0.62_0.22_250/0.1)]"
                    : "text-[oklch(0.65_0.02_260)] hover:text-white hover:bg-[oklch(0.16_0.02_260)]"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
            {/* Steam Live Dropdown */}
            <SteamDropdown location={location} />
          </nav>

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="hidden lg:flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[oklch(0.45_0.02_260)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games..."
                className="pl-9 w-52 h-9 bg-[oklch(0.14_0.015_260)] border-[oklch(0.22_0.015_260)] text-sm placeholder:text-[oklch(0.4_0.02_260)] focus:border-[oklch(0.62_0.22_250)] focus:ring-1 focus:ring-[oklch(0.62_0.22_250/0.3)] transition-all"
              />
            </div>
          </form>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-[oklch(0.65_0.02_260)] hover:text-white hover:bg-[oklch(0.16_0.02_260)]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[oklch(0.2_0.015_260)] bg-[oklch(0.09_0.01_260/0.98)] backdrop-blur-xl">
          <div className="container py-4 space-y-1">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.45_0.02_260)]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search games..."
                  className="pl-10 w-full bg-[oklch(0.14_0.015_260)] border-[oklch(0.22_0.015_260)] placeholder:text-[oklch(0.4_0.02_260)]"
                />
              </div>
            </form>
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  location === href
                    ? "text-[oklch(0.62_0.22_250)] bg-[oklch(0.62_0.22_250/0.1)]"
                    : "text-[oklch(0.65_0.02_260)] hover:text-white hover:bg-[oklch(0.16_0.02_260)]"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            {/* Steam Live section in mobile */}
            <div className="pt-2 pb-1">
              <p className="px-4 text-xs font-semibold text-[oklch(0.42_0.02_260)] uppercase tracking-wider mb-1">Steam Live</p>
              {steamLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    location === href || location.startsWith(href + "/")
                      ? "text-[oklch(0.62_0.22_250)] bg-[oklch(0.62_0.22_250/0.1)]"
                      : "text-[oklch(0.65_0.02_260)] hover:text-white hover:bg-[oklch(0.16_0.02_260)]"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
