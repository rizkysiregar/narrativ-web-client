import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { createRoutesStub } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { endSession, startSession } from "~/api/session";
import Login from "~/routes/login";
import GuestLayout from "~/routes/guest";
import PostPage from "~/routes/post";
import Profile from "~/routes/profile";
import Shell from "~/routes/shell";
import { changeLanguage } from "~/shared/i18n";
import { createQueryClient } from "~/shared/lib/query-client";
import { loginResponse, ok } from "~/test/backend";
import { feedPage, post } from "~/test/fixtures";
import { renderApp } from "~/test/render-app";
import { api, server } from "~/test/server";

type Page = Parameters<typeof createRoutesStub>[0][number]["Component"];

/** The shell with a shared post and profile whose server loader answered `data`, for a visitor without a session. */
function visit(path: string, data: { post?: unknown; profile?: unknown }) {
  const Stub = createRoutesStub([
    { Component: GuestLayout, children: [{ path: "/login", Component: Login }] },
    {
      Component: Shell,
      children: [
        { path: "/", Component: () => <p>home</p> },
        {
          path: "/p/:postId",
          Component: PostPage as unknown as Page,
          handle: { publicPreview: true },
          loader: () => ({ post: data.post ?? null, origin: "https://app.test" }),
        },
        {
          path: "/u/:username",
          Component: Profile as unknown as Page,
          handle: { publicPreview: true },
          loader: () => ({ profile: data.profile ?? null, origin: "https://app.test" }),
        },
      ],
    },
  ]);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Stub initialEntries={[path]} />
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await changeLanguage("en");
  endSession();
});

describe("shared links without a session", () => {
  it("show the public post with a way in that comes back to it", async () => {
    visit("/p/p1", {
      post: {
        id: "p1",
        caption: "Shared story",
        likeCount: 3,
        commentCount: 1,
        author: { username: "ani", fullName: "Ani Wijaya", avatarPath: "/public/users/ani/avatar" },
        media: [{ id: "m1", type: "IMAGE", imagePath: "/public/media/m1" }],
      },
    });

    expect(await screen.findByText("Shared story")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Media 1 of 1 by @ani" })).toHaveAttribute(
      "src",
      "/api/v1/public/media/m1",
    );
    expect(screen.getByText("Join NARRATIV to like, comment and follow @ani.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Sign in" })[0]).toHaveAttribute(
      "href",
      "/login?redirect=%2Fp%2Fp1",
    );
  });

  it("show the public profile", async () => {
    visit("/u/ani", {
      profile: { username: "ani", fullName: "Ani Wijaya", followerCount: 5, followingCount: 2 },
    });

    expect(await screen.findByRole("heading", { name: "Ani Wijaya" })).toBeInTheDocument();
    expect(screen.getByText("Join NARRATIV to see the stories of @ani.")).toBeInTheDocument();
  });

  it("explain a link that is not public", async () => {
    visit("/p/gone", {});

    expect(await screen.findByRole("heading", { name: "Post not available" })).toBeInTheDocument();
  });

  it("still send other pages to sign in", async () => {
    visit("/", {});

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
  });
});

describe("share button", () => {
  it("copies the post's link where there is no share sheet", async () => {
    startSession(loginResponse());
    server.use(http.get(api("/posts"), () => ok(feedPage([post({ id: "p7", caption: "Share me" })]))));
    const user = userEvent.setup();
    renderApp("/");

    await user.click(await screen.findByRole("button", { name: "Share post" }));

    expect(await navigator.clipboard.readText()).toBe(`${location.origin}/p/p7`);
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
  });
});
