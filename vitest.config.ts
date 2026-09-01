// vitest.config.ts
//
// Test foundation for this project. Run with:
//   npm test          -> runs the full suite once (vitest run)
//   npm run test:watch -> reruns on file changes
//
// Kept separate from vite.config.ts (rather than merging via `mergeConfig`) because that file
// wires up TanStack Start's server plugin, nitro's Vercel preset, and Tailwind's Vite plugin —
// none of which the test runner needs, and pulling them in would slow down / complicate `vitest
// run` for no benefit. This config only needs the same `@/*` -> `src/*` path alias tsconfig.json
// defines, via the same vite-tsconfig-paths plugin the main config uses.
//
// Scope, deliberately: this suite covers pure, side-effect-free business logic in src/lib/ only
// (no Supabase, no DOM, no network). It's a foundation to build on, not full coverage.
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsConfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
