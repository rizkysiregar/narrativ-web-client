import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ok } from "~/test/backend";
import { server } from "~/test/server";

import { fetchPublicPost, fetchPublicProfile } from "./public-api.server";

const backend = "https://api-dev-narrativ.rizkysiregar.my.id/api/v1";

const visit = (headers: Record<string, string> = {}) => new Request("https://app.test/p/p1", { headers });

describe("public API from the server render", () => {
  it("passes the visitor's IP and language on, so the backend's rate limit counts the visitor", async () => {
    let seen = new Headers();
    server.use(
      http.get(`${backend}/public/posts/p1`, ({ request }) => {
        seen = request.headers;
        return ok({ id: "p1", caption: "Hello" });
      }),
    );

    const post = await fetchPublicPost(
      visit({ "CF-Connecting-IP": "203.0.113.9", "Accept-Language": "id" }),
      "p1",
    );

    expect(post).toEqual({ id: "p1", caption: "Hello" });
    expect(seen.get("CF-Connecting-IP")).toBe("203.0.113.9");
    expect(seen.get("Accept-Language")).toBe("id");
    expect(seen.get("X-Client-Platform")).toBe("web-ssr");
  });

  it("answers null for a post or profile that is not public", async () => {
    server.use(
      http.get(`${backend}/public/posts/gone`, () =>
        HttpResponse.json({ code: "404", message: "Not found", errorCode: "NOT_FOUND" }, { status: 404 }),
      ),
      http.get(`${backend}/public/users/ghost`, () =>
        HttpResponse.json({ code: "404", message: "Not found", errorCode: "NOT_FOUND" }, { status: 404 }),
      ),
    );

    expect(await fetchPublicPost(visit(), "gone")).toBeNull();
    expect(await fetchPublicProfile(visit(), "ghost")).toBeNull();
  });

  it("answers null when the backend cannot be reached, so the page still renders", async () => {
    server.use(http.get(`${backend}/public/posts/p1`, () => HttpResponse.error()));

    expect(await fetchPublicPost(visit(), "p1")).toBeNull();
  });
});
