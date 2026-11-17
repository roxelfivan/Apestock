import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(frontendRoot, "..");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    fs: {
      allow: [frontendRoot, repoRoot],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
