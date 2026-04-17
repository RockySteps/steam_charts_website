import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import fs from "fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function serveStatic(app: express.Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // XML Sitemap for search engines
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const { getTopGamesByPlayers } = await import("../db");
      const games = await getTopGamesByPlayers(15000);
      const baseUrl = process.env.SITE_URL || "http://143.110.201.167";
      const genres = ["Action", "Adventure", "RPG", "Strategy", "Simulation", "Sports", "Racing", "Indie", "Casual", "Multiplayer", "Puzzle", "Horror", "Shooter", "Platformer", "Survival"];
      const today = new Date().toISOString().split("T")[0];

      const staticUrls = [
        { url: "/", priority: "1.0", changefreq: "hourly" },
        { url: "/charts/top/1-50/", priority: "0.9", changefreq: "hourly" },
        { url: "/charts/top/51-100/", priority: "0.8", changefreq: "hourly" },
        { url: "/charts/top/101-150/", priority: "0.7", changefreq: "daily" },
        { url: "/charts/top/151-200/", priority: "0.6", changefreq: "daily" },
        { url: "/trending", priority: "0.8", changefreq: "hourly" },
        { url: "/genres", priority: "0.7", changefreq: "daily" },
        { url: "/compare", priority: "0.6", changefreq: "weekly" },
        { url: "/search", priority: "0.6", changefreq: "weekly" },
        { url: "/sitemap", priority: "0.4", changefreq: "weekly" },
        ...genres.map((g) => ({ url: `/genres/${g.toLowerCase()}/1-50/`, priority: "0.7", changefreq: "daily" })),
        ...genres.map((g) => ({ url: `/genres/${g.toLowerCase()}/51-100/`, priority: "0.6", changefreq: "daily" })),
      ];

      const gameUrls = games.map((g) => ({ url: `/game/${g.appid}`, priority: "0.8", changefreq: "hourly" }));

      const allUrls = [...staticUrls, ...gameUrls];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(({ url, priority, changefreq }) =>
  `  <url>
    <loc>${baseUrl}${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
).join("\n")}
</urlset>`;
      res.setHeader("Content-Type", "application/xml");
      res.send(xml);
    } catch (err) {
      console.error("[sitemap.xml] Error:", err);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Production: serve static files
  serveStatic(app);

  const preferredPort = parseInt(process.env.PORT || "3001");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
