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
