import { serverConfig } from "~/server/config.server";

/**
 * Production lets search engines read shared posts and profiles, nothing behind sign-in. Every other environment
 * (dev) is closed to them, also by the X-Robots-Tag header of each page.
 */
export function loader() {
  const body = serverConfig().allowIndexing
    ? ["User-agent: *", "Allow: /p/", "Allow: /u/", "Disallow: /", ""].join("\n")
    : ["User-agent: *", "Disallow: /", ""].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=3600" },
  });
}
