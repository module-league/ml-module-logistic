import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
 
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Until the base package is released, "@moduleleague/ui" points at the local copy
      "@moduleleague/ui": path.resolve(import.meta.dirname, "./src/ui-kit.ts"),
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // The LogisticApi "http" launch profile; same-origin calls need no CORS
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
