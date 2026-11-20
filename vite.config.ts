import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

import pkg from "./package.json" with { type: "json" };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    server: {
      port: Number(env.DEV_PORT ?? 3000),
      // The API is same-origin in every environment (the ingress routes /api to the backend), so in development the
      // dev server plays that part. The refresh cookie then belongs to localhost like it belongs to the app host.
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET ?? "https://api-dev-narrativ.rizkysiregar.my.id",
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
