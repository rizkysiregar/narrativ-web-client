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
 * The fake backend of the tests: an empty home feed by default, so a test that lands on the home page needs no setup.
 * Each test adds the handlers it is about with server.use(...).
 */
export const server = setupServer(
  http.get(api("/posts"), () => HttpResponse.json({ code: "200", message: "Success", data: emptyFeed })),
);
