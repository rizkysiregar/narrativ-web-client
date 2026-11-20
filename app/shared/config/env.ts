export const APP_NAME = "NARRATIV";
export const APP_VERSION = __APP_VERSION__;

// Same-origin in every environment: the ingress (and the dev server proxy in development) routes /api to the
// backend, so there is no CORS and the refresh cookie is first-party.
export const API_BASE_PATH = "/api/v1";
