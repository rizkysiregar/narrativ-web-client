import type { Config } from "@react-router/dev/config";

export default {
  // SPA mode for now: nginx serves build/client. Server rendering is switched on in phase 6 for the public share
  // pages (Open Graph previews), see docs/PLAN.md.
  ssr: false,
} satisfies Config;
