import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { startSession } from "~/api/session";
import { changeLanguage } from "~/shared/i18n";
import { fail, loginResponse, ok } from "~/test/backend";
import { feedPage, numberedPage, post } from "~/test/fixtures";
import { renderApp } from "~/test/render-app";
import { api, server } from "~/test/server";

const user = userEvent.setup();

const budi = {
  id: "u-budi",
  username: "budi",
  firstName: "Budi",
  lastName: "Santoso",
  fullName: "Budi Santoso",
};

function budiExists() {
  server.use(
    http.get(api("/users/by-username/budi"), () => ok(budi)),
    http.get(api("/users/u-budi/follow-status"), () =>
      ok({ followerCount: 1500, followingCount: 12, isFollowing: false }),
    ),
  );
}

beforeEach(async () => {
  await changeLanguage("en");
  startSession(loginResponse());
});

describe("profile", () => {
  it("shows who it is, the counts and the posts", async () => {
    budiExists();
    server.use(
      http.get(api("/posts/users/budi/posts"), () =>
        ok(feedPage([post({ username: "budi", caption: "Budi's story" })])),
      ),
    );
    renderApp("/u/budi");

    expect(await screen.findByRole("heading", { name: "Budi Santoso" })).toBeInTheDocument();
    const connections = screen.getByRole("navigation", { name: "Connections" });
    expect(await within(connections).findByRole("link", { name: /1\.5K followers/ })).toHaveAttribute(
      "href",
      "/u/budi/followers",
    );
    expect(within(connections).getByRole("link", { name: /12 following/ })).toHaveAttribute(
      "href",
      "/u/budi/following",
    );
    expect(await screen.findByText("Budi's story")).toBeInTheDocument();
  });

  it("shows the media tab as a grid", async () => {
    budiExists();
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(api("/posts/users/budi/posts"), ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return ok(
          feedPage([
            post({ id: "p-media", media: [{ id: "m", type: "IMAGE", url: "https://media.test/a.jpg" }] }),
          ]),
        );
      }),
    );
    renderApp("/u/budi/media");

    expect(await screen.findByRole("link", { name: "Open post" })).toHaveAttribute("href", "/p/p-media");
    expect(requests[0]?.get("mediaOnly")).toBe("true");
  });

  it("explains a profile that cannot be shown", async () => {
    server.use(http.get(api("/users/by-username/ghost"), () => fail(404, "Not found", "NOT_FOUND")));
    renderApp("/u/ghost");

    expect(await screen.findByRole("heading", { name: "Profile not available" })).toBeInTheDocument();
  });

  it("opens the signed-in user's own profile from the Profile tab", async () => {
    server.use(
      http.get(api("/users/by-username/ani"), () =>
        ok({ id: "u1", username: "ani", fullName: "Ani Wijaya" }),
      ),
      http.get(api("/users/u1/follow-status"), () => ok({ followerCount: 0, followingCount: 0 })),
      http.get(api("/posts/users/ani/posts"), () => ok(feedPage([]))),
    );
    renderApp("/profile");

    expect(await screen.findByRole("heading", { name: "Ani Wijaya" })).toBeInTheDocument();
    expect(await screen.findByText("No posts yet")).toBeInTheDocument();
  });
});

describe("followers", () => {
  it("lists the people, page after page", async () => {
    budiExists();
    server.use(
      http.get(api("/users/u-budi/followers"), ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        return page === 0
          ? ok(
              numberedPage([{ id: "f1", username: "citra", firstName: "Citra", lastName: "Dewi" }], 0, false),
            )
          : ok(numberedPage([{ id: "f2", username: "dodi" }], 1, true));
      }),
    );
    renderApp("/u/budi/followers");

    expect(await screen.findByRole("heading", { name: "Followers of @budi" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Citra Dewi/ })).toHaveAttribute("href", "/u/citra");
    await user.click(screen.getByRole("button", { name: "Show more" }));
    expect(await screen.findByRole("link", { name: /@dodi/ })).toBeInTheDocument();
  });
});
