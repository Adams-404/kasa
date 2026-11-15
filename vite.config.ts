import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    // MapLibre is the map engine; it is the one big chunk we accept.
    chunkSizeWarningLimit: 1500,
  },
});
