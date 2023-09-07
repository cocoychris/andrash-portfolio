import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "./dist",
  },
  server: {
    port: 80,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  preview: {
    port: 8080,
    strictPort: true,
  },
});
