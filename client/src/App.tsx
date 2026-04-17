import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Charts from "./pages/Charts";
import GameDetail from "./pages/GameDetail";
import Trending from "./pages/Trending";
import Genres from "./pages/Genres";
import Compare from "./pages/Compare";
import SearchPage from "./pages/SearchPage";
import SitemapPage from "@/pages/SitemapPage";
import LiveStats from "@/pages/LiveStats";
import TopSellers from "@/pages/TopSellers";
import NewReleases from "@/pages/NewReleases";
import UpcomingGames from "@/pages/UpcomingGames";

/** Scroll to top whenever the route changes */
function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.08_0.01_260)]">
      <Navbar />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function Router() {
  return (
    <>
    <ScrollToTop />
    <Switch>
      <Route path="/" component={() => <Layout><Home /></Layout>} />
      {/* SEO-friendly paginated charts: /charts/top/1-50/ */}
      <Route path="/charts/top/:range" component={() => <Layout><Charts /></Layout>} />
      <Route path="/charts" component={() => <Layout><Charts /></Layout>} />
      <Route path="/game/:appid" component={() => <Layout><GameDetail /></Layout>} />
      <Route path="/trending" component={() => <Layout><Trending /></Layout>} />
      {/* SEO-friendly paginated genres: /genres/action/1-50/ */}
      <Route path="/genres/:genre/:range" component={() => <Layout><Genres /></Layout>} />
      <Route path="/genres/:genre" component={() => <Layout><Genres /></Layout>} />
      <Route path="/genres" component={() => <Layout><Genres /></Layout>} />
      <Route path="/compare" component={() => <Layout><Compare /></Layout>} />
      <Route path="/search" component={() => <Layout><SearchPage /></Layout>} />
      <Route path="/sitemap" component={() => <Layout><SitemapPage /></Layout>} />
      <Route path="/live" component={() => <Layout><LiveStats /></Layout>} />
      <Route path="/top-sellers" component={() => <Layout><TopSellers /></Layout>} />
      <Route path="/new-releases" component={() => <Layout><NewReleases /></Layout>} />
      {/* SEO-friendly paginated upcoming games: /upcoming/1-50/ */}
      <Route path="/upcoming/:range" component={() => <Layout><UpcomingGames /></Layout>} />
      <Route path="/upcoming" component={() => <Layout><UpcomingGames /></Layout>} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
