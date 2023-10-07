import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  build: {
    outDir: "./dist",
  },
  server: {
    port: 80,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:8000",
      "/socket.io": { target: "ws://localhost:8000", ws: true },
    },
  },
  preview: {
    port: 8080,
    strictPort: true,
  },
});
