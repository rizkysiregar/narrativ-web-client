import { API_BASE_PATH } from "~/shared/config/env";

/**
 * Absolute URL of an API path, e.g. apiUrl("/auth/refresh"). Absolute so it also works in tests; relative where
 * there is no page (the build pre-renders index.html in Node).
 */
export function apiUrl(path = ""): string {
  const origin = typeof location === "undefined" ? "" : location.origin;
  return `${origin}${API_BASE_PATH}${path}`;
}
