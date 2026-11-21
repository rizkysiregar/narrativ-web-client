import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { loginResponse, ok } from "~/test/backend";
import { api, server } from "~/test/server";

import { endSession, restoreSession, useSession } from "./session";

describe("restoreSession", () => {
  beforeEach(() => {
    // this browser was signed in when it was last used
    localStorage.setItem("narrativ:signed-in", "1");
  });

  it("picks the session up from the refresh cookie", async () => {
    server.use(http.post(api("/auth/refresh"), () => ok(loginResponse())));

    await restoreSession();

    expect(useSession.getState()).toMatchObject({ status: "authenticated", user: { username: "ani" } });
  });

  it("is anonymous without a session", async () => {
    server.use(
      http.post(api("/auth/refresh"), () =>
        HttpResponse.json({ code: "401", message: "x" }, { status: 401 }),
      ),
    );

    await restoreSession();

    expect(useSession.getState().status).toBe("anonymous");
  });

  it("is anonymous when the backend cannot be reached", async () => {
    server.use(http.post(api("/auth/refresh"), () => HttpResponse.error()));

    await restoreSession();

    expect(useSession.getState().status).toBe("anonymous");
  });

  it("does not ask the backend when this browser signed out last time", async () => {
    localStorage.removeItem("narrativ:signed-in");
    let refreshes = 0;
    server.use(
      http.post(api("/auth/refresh"), () => {
        refreshes += 1;
        return ok(loginResponse());
      }),
    );

    await restoreSession();

    expect(useSession.getState().status).toBe("anonymous");
    expect(refreshes).toBe(0);
  });

  it("remembers signing in and out", async () => {
    server.use(http.post(api("/auth/refresh"), () => ok(loginResponse())));

    await restoreSession();
    expect(localStorage.getItem("narrativ:signed-in")).toBe("1");

    endSession();
    expect(localStorage.getItem("narrativ:signed-in")).toBeNull();
  });

  it("keeps trying next time when the backend was only busy or unreachable", async () => {
    server.use(
      http.post(api("/auth/refresh"), () =>
        HttpResponse.json({ code: "429", message: "busy" }, { status: 429 }),
      ),
    );

    await restoreSession();

    expect(useSession.getState().status).toBe("anonymous");
    expect(localStorage.getItem("narrativ:signed-in")).toBe("1");
  });

  it("forgets the session when the backend refuses the cookie", async () => {
    server.use(
      http.post(api("/auth/refresh"), () =>
        HttpResponse.json({ code: "401", message: "x" }, { status: 401 }),
      ),
    );

    await restoreSession();

    expect(localStorage.getItem("narrativ:signed-in")).toBeNull();
  });
});
