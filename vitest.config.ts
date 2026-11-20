import { defineConfig } from "vitest/config";

// Separate from vite.config.ts: the React Router plugin builds the whole app and is not wanted in unit tests.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify("0.0.0-test"),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./app/test/setup.ts"],
    include: ["app/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    unstubGlobals: true,
  },
});
