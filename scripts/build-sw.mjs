// Bundles app/sw/firebase-messaging-sw.ts into one classic script at <outDir>/firebase-messaging-sw.js.
//   node scripts/build-sw.mjs build/client     after react-router build (production)
//   node scripts/build-sw.mjs public           before the dev server, so the dev server serves it too
// A service worker must be served from the root to control the whole app, and same-origin keeps the CSP strict.
import { build } from "vite";

const outDir = process.argv[2] ?? "build/client";

await build({
  configFile: false,
  logLevel: "warn",
  build: {
    outDir,
    emptyOutDir: false,
    copyPublicDir: false,
    lib: {
      entry: "app/sw/firebase-messaging-sw.ts",
      formats: ["iife"],
      name: "narrativMessagingWorker",
      fileName: () => "firebase-messaging-sw.js",
    },
  },
});
console.log(`${outDir}/firebase-messaging-sw.js written.`);
