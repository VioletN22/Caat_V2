import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    pool: "vmThreads",
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text"],
      // Report only the pure-logic modules the unit suite actually targets, so
      // the summary is a meaningful signal rather than diluted by UI/route code
      // that is exercised by the e2e smoke instead. Soft reporting only, no
      // hard threshold yet (see the Phase 6 plan G5).
      // Globs avoid the literal "(main)" route-group parens (glob-special).
      include: [
        "lib/scholarship-tracking.ts",
        "lib/scholarship-filters.ts",
        "lib/local-date.ts",
        "lib/profile-match.ts",
        "app/**/applications/api.ts",
        "app/**/communities/actions/_shared.ts",
        "app/**/communities/actions/profiles.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
