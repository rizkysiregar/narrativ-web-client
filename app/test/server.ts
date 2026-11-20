import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

/** Matches an API path on any origin, e.g. api("/auth/refresh"). */
export const api = (path: string) => `*/api/v1${path}`;

const emptyFeed = {
  content: [],
  last: true,
  pageNumber: -1,
  pageSize: 10,
  totalElements: -1,
  totalPages: -1,
};

/**
 * The fake backend of the tests: an empty home feed and no unread notifications by default (the app shell asks for
 * the badge on every page), so a test needs no setup for what it is not about. Each test adds its handlers with
 * server.use(...).
 */
export const server = setupServer(
  http.get(api("/posts"), () => HttpResponse.json({ code: "200", message: "Success", data: emptyFeed })),
  http.get(api("/users/me/notifications/unread-count"), () =>
    HttpResponse.json({ code: "200", message: "Success", data: { unread: 0 } }),
  ),
);
