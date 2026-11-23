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
 * The fake backend of the tests: an empty home feed, no unread notifications and no Google sign-in by default (the app shell asks for
 * the badge on every page), so a test needs no setup for what it is not about. Each test adds its handlers with
 * server.use(...).
 */
export const server = setupServer(
  http.get(api("/posts"), () => HttpResponse.json({ code: "200", message: "Success", data: emptyFeed })),
  http.get(api("/users/me/notifications/unread-count"), () =>
    HttpResponse.json({ code: "200", message: "Success", data: { unread: 0 } }),
  ),
  // chat is off by default (503 like the backend without app.marpokat.*): the shell asks for a token on every page
  http.post(api("/chat/token"), () =>
    HttpResponse.json(
      { code: "503", message: "Chat unavailable", data: null, errorCode: "CHAT_UNAVAILABLE" },
      { status: 503 },
    ),
  ),
  // the admin has chat switched on: the shell asks for the feature switches on every page
  http.get(api("/config/client"), () =>
    HttpResponse.json({ code: "200", message: "Success", data: { features: { chat: true } } }),
  ),
  // no Google client id: the auth and account pages show no Google button unless a test turns it on
  http.get(api("/auth/google-config"), () =>
    HttpResponse.json({ code: "200", message: "Success", data: { enabled: false } }),
  ),
);
