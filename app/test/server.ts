import { setupServer } from "msw/node";

/** The fake backend of the tests. Each test adds the handlers it needs with server.use(...). */
export const server = setupServer();

/** Matches an API path on any origin, e.g. api("/auth/refresh"). */
export const api = (path: string) => `*/api/v1${path}`;
