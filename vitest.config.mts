import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    maxWorkers: 2,
    exclude: ["**/node_modules/**", "**/.git/**", "e2e/**", "DaemonDoc/**"],
    // NextAuth's extensionless Next.js imports need Vite's module resolution.
    server: { deps: { inline: ["next-auth"] } },
  },
  resolve: {
    alias: {
      "@": root,
      // Next.js enforces this marker during builds; Vitest runs these modules on the server.
      "server-only": path.resolve(root, "node_modules/next/dist/compiled/server-only/empty.js"),
    },
  },
});
