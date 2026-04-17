# Steam Charts Website - TODO

## Backend & API Integration
- [x] Install additional npm packages (recharts already included, axios for API calls)
- [x] Create Steam API service (server/services/steamApi.ts) - GetNumberOfCurrentPlayers, AppDetails
- [x] Create SteamSpy API service (server/services/steamSpyApi.ts) - top100in2weeks, top100forever, appdetails, genre
- [x] Create Steam Charts history service (server/services/steamChartsApi.ts) - historical player data generation
- [x] DB schema: game_cache table for caching API responses
- [x] DB schema: player_history table for storing historical player counts
- [x] Data sync service (background population from APIs on startup)
- [x] tRPC router: games.getTopCharts - top 100 games with current/peak players
- [x] tRPC router: games.getTrending - trending games (biggest gainers)
- [x] tRPC router: games.getGameDetail - full game info + stats
- [x] tRPC router: games.getPlayerHistory - historical player count data
- [x] tRPC router: games.search - search by name, genre, price, players
- [x] tRPC router: games.getByGenre - games by genre
- [x] tRPC router: games.getRecords - all-time records, biggest gainers/losers
- [x] tRPC router: games.compareGames - compare up to 4 games
- [x] tRPC router: games.getGenres - genre stats with counts and total players
- [x] tRPC router: games.getStats - platform-wide stats overview

## Global Layout & Design System
- [x] Set up dark gamer theme in index.css with OKLCH color tokens
- [x] Premium fonts: Inter (body) + Rajdhani (display) + JetBrains Mono (code)
- [x] Navbar component with logo, navigation links, search bar, mobile menu
- [x] Footer component with links, resources, social icons
- [x] AdZone component for monetization zones (leaderboard, banner, rectangle, sidebar)
- [x] StatCard component for key metrics display
- [x] GameCard component for game listings (default + compact variants)
- [x] SEOHead component for dynamic per-page meta tags
- [x] Shimmer loading skeletons for all async data states
- [x] Pulse dot live indicator animation
- [x] Page enter animations
- [x] Card hover effects with glow
- [x] Custom scrollbar styling
- [x] Gradient text utilities

## Homepage (/)
- [x] Hero section with animated background, tagline, and live stats
- [x] Live Top Games leaderboard (top 10 with real-time player counts)
- [x] Trending Games section
- [x] Key Stats overview (total players online, games tracked, etc.)
- [x] Ad placement zones (hero bottom, between sections)

## Top Charts Page (/charts)
- [x] Sortable table: current players, peak players, all-time peak, owners
- [x] Filter controls: genre, sort by
- [x] Pagination with load more
- [x] Visual bar indicators for player counts
- [x] Ad placement zones

## Game Detail Page (/game/:appid)
- [x] Game header with banner, title, developer, publisher, tags
- [x] Live player count display
- [x] Historical player count chart (daily/weekly/monthly/yearly toggle)
- [x] Game stats panel: all-time peak, average players, review score, owners
- [x] Price info with discount badge
- [x] Genre and tag chips
- [x] Screenshots gallery
- [x] Platform indicators (Windows/Mac/Linux)
- [x] Ad placement zones

## Trending & Records Page (/trending)
- [x] All-time peak records leaderboard
- [x] Top gainers section
- [x] Top losers section
- [x] Notable milestones section
- [x] Ad placement zones

## Genre Explorer Page (/genres)
- [x] Genre grid with game counts
- [x] Genre filtering with active state
- [x] Games list filtered by selected genre
- [x] Genre overview stats panel
- [x] Ad placement zones

## Game Comparison Tool (/compare)
- [x] Game selector (up to 4 games) with search
- [x] Quick-add from top games
- [x] Side-by-side stats comparison table with best-value highlighting
- [x] Overlapping historical player count chart with period toggle
- [x] Ad placement zones

## Advanced Search Page (/search)
- [x] Search by game name
- [x] Filter by genre (select)
- [x] Filter by price range (slider)
- [x] Filter by player count range (slider)
- [x] Sort options (current players, peak, owners, playtime)
- [x] Active filter chips with clear buttons
- [x] Results grid with pagination
- [x] Empty state UI
- [x] Ad placement zones

## SEO & Monetization
- [x] Dynamic meta tags per page (title, description, og:image, twitter card)
- [x] JSON-LD structured data (WebSite schema with SearchAction)
- [x] sitemap.xml
- [x] robots.txt
- [x] Canonical URLs via SEOHead
- [x] Ad placeholder zones throughout site
- [x] index.html full SEO head with all meta tags
- [x] Google Fonts preconnect

## Polish & Performance
- [x] Smooth page transitions (page-enter animation)
- [x] Loading skeletons for all async data
- [x] Error boundary and fallback UI
- [x] Mobile-first responsive design across all pages
- [x] Hover micro-interactions on cards and links
- [x] Number formatting utilities (1.2M, 45.3K, etc.)
- [x] Vitest unit tests for all backend routers (13 tests passing)
- [x] Custom scrollbar styling
- [x] SVG favicon

## Future Improvements (Post-Launch)
- [ ] Real 24h gain/loss data from backend (currently uses deterministic approximation based on appid)
- [ ] Live autocomplete on Advanced Search page (currently submit-based search)
- [ ] Per-game JSON-LD structured data on Game Detail pages (VideoGame/Product schema)
- [ ] Expanded test coverage for getGameDetail, getByGenre, compareGames edge cases
- [ ] Real historical data storage from Steam API (currently generates realistic mock history)
- [ ] User accounts: save favorite games, custom watchlists
- [ ] Email/push notifications for player count milestones
- [ ] API rate limiting and caching improvements

## 13K Games Crawler & Admin Dashboard (Phase 2 - Complete)
- [x] Parse uploaded apps.txt (13,511 app IDs, one per line) and seed crawl_queue table
- [x] DB schema: crawl_queue table (appid, priority, status, last_crawled_at, retry_count)
- [x] DB schema: crawl_log table (job_id, started_at, completed_at, total, success, failed)
- [x] DB schema: monthly_stats table (appid, year, month, avg/peak/min/gain/gain_percent)
- [x] Update crawlerService: top 100 by CCU get priority=100 (crawled first on startup)
- [x] Remaining 13K games get priority=1 (crawled in batches, rate-limit safe)
- [x] 24-hour auto-refresh scheduler for all games in database
- [x] Batch crawler: process 10 games at a time with 1s delay between requests
- [x] Admin Dashboard page (/admin)
- [x] Admin: Crawler status panel (running/paused/idle, progress bar, games crawled/total)
- [x] Admin: Start/Pause/Resume/Stop crawler controls
- [x] Admin: Database overview (total games, players online, processed today, queue remaining)
- [x] Admin: Game Queue tab (paginated, filter by status, per-game refresh button)
- [x] Admin: Crawl Logs tab (job history with success/fail counts, trigger type, timestamps)
- [x] Admin: Overview tab (top games + crawler status details)
- [x] Admin link added to Navbar (desktop + mobile)
- [x] Highcharts integration on Game Detail page (replaces Recharts)
- [x] PNG / SVG / Print export via Highcharts exporting module
- [x] Monthly Stats table (Month, Avg Players, Gain, % Gain, Peak Players)
- [x] Steam user reviews from official Steam API (all/positive/negative/recent filters)
- [x] Game Detail tabbed interface: Player Chart | Monthly Stats | User Reviews
- [x] "Update Data" button on Game Detail page (triggers manual refresh)
- [x] tRPC: admin.getCrawlerStatus, admin.getSiteStats, admin.getCrawlLogs, admin.getQueuePage
- [x] tRPC: admin.startCrawler, admin.stopCrawler, admin.pauseCrawler, admin.resumeCrawler, admin.refreshGame
- [x] tRPC: games.triggerUpdate - public endpoint for Update Data button
- [x] tRPC: games.getMonthlyStats - monthly aggregated player stats
- [x] tRPC: games.getReviews - official Steam user reviews
- [x] 13 vitest tests passing, 0 TypeScript errors

## Currently Trending Section (Phase 3)
- [x] Backend: store previous player count snapshot per game (prev_ccu column in game_cache)
- [x] Backend: calculate real gain/loss (current ccu - prevCcu) and percent changee
- [x] tRPC: games.getTrendingNow - returns top gainers and losers sorted by absolute/percent change
- [x] TrendingSection component: tabbed Gainers / Losers view
- [x] TrendingSection: mini sparkline chart per game (last 7 data points)
- [x] TrendingSection: player count change badge (+X / -X with color coding)
- [x] TrendingSection: percent change indicator with up/down arrow
- [x] TrendingSection: live pulse dot on top gainers
- [x] Integrate TrendingSection on Homepage (replace or augment existing trending block)
- [x] Integrate TrendingSection on Trending page (top of page, above all-time records)
- [x] Vitest tests for getTrendingNow endpoint

## Game Detail Page Enhancements (Phase 4)
- [x] tRPC: games.getGameNews - recent news from Steam News API (GetNewsForApp)
- [x] tRPC: games.getFullMetadata includes system requirements (pcRequirements, macRequirements, linuxRequirements fields)
- [x] tRPC: games.getFullMetadata - complete game metadata (categories, DLC, achievements, languages, age rating)
- [x] tRPC: games.getReviewsV2 - total reviews, positive/negative counts, review score summary (verified in routers.ts)
- [x] Steam News component: recent articles with title, date, source, excerpt, external link
- [x] System Requirements component: PC/Mac/Linux tabs with min/recommended specs
- [x] Full Metadata component: categories, supported languages, DLC list, achievements count, age rating, content descriptors
- [x] Review Summary bar: total reviews, positive %, negative %, score label (Overwhelmingly Positive etc.)
- [x] Enhanced Highcharts export: PNG, JPEG, SVG download options (extend existing chart)
- [x] Monthly Stats table: sortable by all columns (Month, Avg Players, Gain, % Gain, Peak Players) with asc/desc toggle
- [x] Game Detail page tabs: Overview | Player Stats | Reviews | News | System Requirements
- [x] Vitest tests for getGameNews (3), getFullMetadata (3 incl. sysreq fields), getReviewsV2 (4) — 59 total tests passing

## Bug Fixes & Enhancements (Phase 5)
- [x] Fix scroll-to-top on page navigation (currently loads at same scroll position)
- [x] Fix dynamic per-game SEO titles server-side (view-source shows generic title, not game name)
- [x] Remove em dash (—) from all page title templates
- [x] Fix Highcharts accessibility module crash (TypeError: Cannot read properties of undefined reading 'enabled') that breaks all pages after admin login
- [x] Add App ID numeric search support (e.g. searching "730" finds CS2 directly)
- [x] Fix chart: show dual-line (Daily Avg Players + Daily Peak Players) with navigator/zoom bar
- [x] Fix chart: "All" period should show data from game launch date, not just 1 year
- [x] Fix monthly stats table: show all months from game launch, not just 1 month
- [x] Fix Compare page: "+ Add Game" button always disabled — should open search
- [x] Fix Compare page: chart invisible but tooltip works (OKLCH colors replaced with hex for Highcharts SVG rendering)
- [x] Fix Compare page: stats comparison table should highlight winner per metric

## Phase 6 — DO Deployment Improvements

- [ ] Export Manus MySQL DB and import into DO server (migrate 12.8k games)
- [ ] Fix image 404 infinite loop — validate header_image, fallback to correct Steam CDN URL
- [ ] Add SEO paginated URL for Top Charts: /charts/top/1-50/, /charts/top/51-100/ etc.
- [ ] Add SEO paginated URL for Genres: /genres/action/1-50/, /genres/action/51-100/ etc.
- [ ] Fix genre page — show all games with scroll after genre selection, fix game count
- [ ] Remove Admin login link from navbar
- [ ] Fix review score display (show N/A or remove if data unavailable)
- [ ] Add human-readable /sitemap page
- [ ] Add XML SEO sitemap at /sitemap.xml with game/genre/chart URLs
- [ ] Build and deploy all changes to DO server
