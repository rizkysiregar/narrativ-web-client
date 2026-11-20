import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { loginResponse, ok } from "~/test/backend";
import { api, server } from "~/test/server";

import { restoreSession, useSession } from "./session";

describe("restoreSession", () => {
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
});
