import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { api, server } from "~/test/server";

import { apiFetch } from "./fetch";
import { refreshSession, startSession, useSession } from "./session";
import { apiUrl } from "./url";

const session = (token: string) => ({ token, userId: "u1", username: "ani", role: "USER" as const });

const ok = (data: unknown) => HttpResponse.json({ code: "200", message: "Success", data });

const expired = () =>
  HttpResponse.json(
    { code: "401", message: "Your session has ended.", errorCode: "UNAUTHORIZED" },
    { status: 401 },
  );

/** /users/me answers 200 only for the given token. */
function meAcceptsOnly(token: string) {
  const seen: (string | null)[] = [];
  server.use(
    http.get(api("/users/me"), ({ request }) => {
      const auth = request.headers.get("Authorization");
      seen.push(auth);
      return auth === `Bearer ${token}` ? ok({ username: "ani" }) : expired();
    }),
  );
  return seen;
}

function refreshAnswers(...tokens: string[]) {
  const calls: Request[] = [];
  server.use(
    http.post(api("/auth/refresh"), ({ request }) => {
      calls.push(request);
      const token = tokens[calls.length - 1];
      return token ? ok(session(token)) : expired();
    }),
  );
  return calls;
}

const getMe = () => apiFetch(new Request(apiUrl("/users/me")));

describe("apiFetch", () => {
  it("sends the client headers and the access token", async () => {
    startSession(session("access-1"));
    let headers = new Headers();
    server.use(
      http.get(api("/users/me"), ({ request }) => {
        headers = request.headers;
        return ok({});
      }),
    );

    await getMe();

    expect(headers.get("Authorization")).toBe("Bearer access-1");
    expect(headers.get("X-Client-Platform")).toBe("web");
    expect(headers.get("X-App-Version")).toBe("0.0.0-test");
    expect(headers.get("Accept-Language")).toMatch(/^(en|id)$/);
  });

  it("refreshes an expired access token once and repeats the call", async () => {
    startSession(session("access-1"));
    const seen = meAcceptsOnly("access-2");
    const refreshes = refreshAnswers("access-2");

    const response = await getMe();

    expect(response.status).toBe(200);
    expect(seen).toEqual(["Bearer access-1", "Bearer access-2"]);
    expect(refreshes).toHaveLength(1);
    // no body: the backend reads the refresh token from the HttpOnly cookie of a web client
    expect(refreshes[0]?.headers.get("X-Client-Platform")).toBe("web");
    expect(await refreshes[0]?.text()).toBe("");
    expect(useSession.getState().accessToken).toBe("access-2");
  });

  it("shares one refresh between calls that expire together", async () => {
    startSession(session("access-1"));
    meAcceptsOnly("access-2");
    const refreshes = refreshAnswers("access-2", "access-3");

    const responses = await Promise.all([getMe(), getMe(), getMe()]);

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
    expect(refreshes).toHaveLength(1);
  });

  it("does not refresh again for a call refused with a token that was already replaced", async () => {
    startSession(session("access-2"));
    const refreshes = refreshAnswers("access-3");

    expect(await refreshSession("access-1")).toBe(true);
    expect(refreshes).toHaveLength(0);
  });

  it("ends the session when the refresh is refused and hands back the 401", async () => {
    startSession(session("access-1"));
    meAcceptsOnly("never");
    refreshAnswers();

    const response = await getMe();

    expect(response.status).toBe(401);
    expect(useSession.getState()).toMatchObject({ status: "anonymous", accessToken: null, endReason: null });
  });

  it("keeps the ban reason when the account was banned", async () => {
    startSession(session("access-1"));
    meAcceptsOnly("never");
    server.use(
      http.post(api("/auth/refresh"), () =>
        HttpResponse.json(
          { code: "401", message: "Banned. Reason: spam", errorCode: "USER_BANNED_REASON", args: ["spam"] },
          { status: 401 },
        ),
      ),
    );

    await getMe();

    expect(useSession.getState().endReason).toBe("Banned. Reason: spam");
  });

  it("keeps the session when the refresh fails on the server", async () => {
    startSession(session("access-1"));
    meAcceptsOnly("never");
    server.use(http.post(api("/auth/refresh"), () => new HttpResponse(null, { status: 503 })));

    const response = await getMe();

    expect(response.status).toBe(401);
    expect(useSession.getState().status).toBe("authenticated");
  });

  it("does not refresh a 401 of a call made without a session", async () => {
    meAcceptsOnly("access-1");
    const refreshes = refreshAnswers("access-1");

    const response = await getMe();

    expect(response.status).toBe(401);
    expect(refreshes).toHaveLength(0);
  });

  it("repeats a call with its body", async () => {
    startSession(session("access-1"));
    refreshAnswers("access-2");
    const bodies: string[] = [];
    server.use(
      http.post(api("/posts"), async ({ request }) => {
        bodies.push(await request.text());
        return request.headers.get("Authorization") === "Bearer access-2" ? ok({}) : expired();
      }),
    );

    const response = await apiFetch(
      new Request(apiUrl("/posts"), { method: "POST", body: JSON.stringify({ caption: "hi" }) }),
    );

    expect(response.status).toBe(200);
    expect(bodies).toEqual(['{"caption":"hi"}', '{"caption":"hi"}']);
  });
});
