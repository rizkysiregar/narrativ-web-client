import createClient from "openapi-fetch";

import { apiFetch } from "./fetch";
import type { paths } from "./schema";
import { apiUrl } from "./url";

/**
 * Typed client of the NARRATIV API, generated from its OpenAPI document (`npm run api:generate`). Wrap calls in
 * `request()` from ./errors to get the envelope's data or an ApiError. Only `features/<x>/api.ts` modules use it.
 */
export const api = createClient<paths>({
  baseUrl: apiUrl(),
  fetch: apiFetch,
  credentials: "same-origin",
});
