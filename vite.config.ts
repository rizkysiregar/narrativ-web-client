import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

import pkg from "./package.json" with { type: "json" };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.API_PROXY_TARGET ?? "https://api-dev-narrativ.rizkysiregar.my.id";

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
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          // the browser sends Origin: http://localhost:<port>, which the backend would judge cross-origin and refuse
          // (403) unless that exact origin is in its CORS list; to the backend the call must look same-origin
          configure: (proxy) => {
            proxy.on("proxyReq", (request) => {
              if (request.getHeader("origin")) {
                request.setHeader("origin", new URL(apiTarget).origin);
              }
            });
          },
        },
      },
    },
  };
});
