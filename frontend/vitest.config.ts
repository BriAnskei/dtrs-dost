/// <reference types="vitest/globals" />
import { defineConfig } from "vitest/config";

/**
 * Dedicated test config (kept separate from vite.config.ts so the app build
 * is untouched).  Pair with the devDependencies listed in
 *   src/tests/INSTALL_NOTES.md
 * before running:  pnpm add -D vitest happy-dom @testing-library/react @testing-library/jest-dom
 */
export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true, // required so @testing-library/jest-dom can reference global `expect`
    setupFiles: ["./src/tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    clearMocks: true,
    restoreMocks: true,
  },
});
