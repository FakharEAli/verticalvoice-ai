import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

// Load `.env.local` (and friends) the same way Next.js does, so integration
// tests can see NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / etc.
const env = loadEnv("", process.cwd(), "");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/tests/**/*.test.ts", "src/tests/**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**", "src/tests/scenarios/**"],
    testTimeout: 20000,
    hookTimeout: 20000,
    env,
  },
});
