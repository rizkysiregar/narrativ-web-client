/**
 * The in-app path to go to after signing in, from an untrusted ?redirect= value. Anything that is not a plain path of
 * this app (another origin, a protocol-relative //host, a backslash trick) falls back to the home page, so the
 * parameter cannot send users to another site.
 */
export function safeRedirect(target: string | null | undefined, fallback = "/"): string {
  if (!target?.startsWith("/") || target.startsWith("//") || target.includes("\\")) {
    return fallback;
  }
  return target;
}
