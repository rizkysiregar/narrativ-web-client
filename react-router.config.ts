import type { Config } from "@react-router/dev/config";

export default {
  // Server rendering, for shared links: the post and profile pages answer link preview crawlers with Open Graph
  // tags, and visitors without an account with a public preview. The signed-in app still renders in the browser
  // (its layouts render the start-up screen on the server, see clientLoader.hydrate in routes/shell.tsx).
  ssr: true,
} satisfies Config;
