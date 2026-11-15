import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { handleChat } from "./server/chat";

const NOMINATIM = "https://nominatim.openstreetmap.org";

/**
 * Development proxy for OpenStreetMap Nominatim.
 *
 * The browser can call Nominatim directly (it sends `Access-Control-Allow-Origin: *`),
 * and the production build does. In development we go through this route so the
 * provider lives behind one seam, and so we can send an honest User-Agent that a
 * browser will not let us set. Nominatim's policy asks for exactly that, plus at
 * most one request per second; the client enforces the rate.
 */
function nominatimProxy(): Plugin {
  return {
    name: "kasa-nominatim-proxy",
    configureServer(server) {
      server.middlewares.use("/api/nominatim", async (req, res) => {
        const incoming = new URL(req.originalUrl ?? "/", "http://localhost");
        const path = incoming.pathname.replace(/^\/api\/nominatim/, "") || "/search";
        if (!/^\/(search|reverse)$/.test(path)) {
          res.statusCode = 404;
          res.end('{"error":"unknown nominatim route"}');
          return;
        }

        const target = new URL(NOMINATIM + path);
        incoming.searchParams.forEach((value, key) => target.searchParams.set(key, value));

        try {
          const upstream = await fetch(target, {
            headers: {
              "User-Agent": "Kasa/0.1 (NASA Space Apps 2026 demo; local development)",
              Referer: "http://localhost:5173/",
              "Accept-Language": "en",
            },
          });
          res.statusCode = upstream.status;
          res.setHeader("content-type", upstream.headers.get("content-type") ?? "application/json");
          res.setHeader("cache-control", "no-store");
          res.end(Buffer.from(await upstream.arrayBuffer()));
        } catch {
          res.statusCode = 502;
          res.end('{"error":"nominatim unreachable"}');
        }
      });
    },
  };
}

/**
 * The assistant route in development.
 *
 * Same handler as the deployed function in `api/chat.ts`, so there is one
 * implementation of the prompt, the validation and the provider call. Vite does
 * not put `.env` into `process.env`, so the file values are loaded here and
 * merged over the real environment.
 */
function chatRoute(): Plugin {
  return {
    name: "kasa-chat-route",
    configureServer(server) {
      const env = { ...process.env, ...loadEnv("development", process.cwd(), "") };
      server.middlewares.use("/api/chat", (req, res) => {
        void handleChat(req, res, env);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), nominatimProxy(), chatRoute()],
  server: { port: 5173 },
  build: {
    // MapLibre is the map engine; it is the one big chunk we accept.
    chunkSizeWarningLimit: 1500,
  },
});
