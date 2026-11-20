import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { startSession } from "~/api/session";
import { changeLanguage } from "~/shared/i18n";
import { loginResponse, ok } from "~/test/backend";
import { numberedPage, post } from "~/test/fixtures";
import { renderApp } from "~/test/render-app";
import { api, server } from "~/test/server";

const user = userEvent.setup();

const comment = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  userId: "u9",
  username: "citra",
  commentContent: `Comment ${id}`,
  createdAt: new Date().toISOString(),
  replyCount: 0,
  pinned: false,
  canDelete: false,
  moderationStatus: "ACTIVE",
  ...overrides,
});

/** The post page of p1, written by `author`, with the given top-level comments. */
function postWithComments(author: string, comments: ReturnType<typeof comment>[]) {
  server.use(
    http.get(api("/posts/p1"), () =>
      ok(post({ id: "p1", userId: author, caption: "The post", commentCount: comments.length })),
    ),
    http.get(api("/posts/p1/comments"), () => ok(numberedPage(comments))),
  );
}

beforeEach(async () => {
  await changeLanguage("en");
  startSession(loginResponse()); // userId "u1"
});

describe("comments", () => {
  it("lists the comments with the pinned one marked, and opens replies", async () => {
    postWithComments("u9", [comment("c1", { pinned: true, replyCount: 2 }), comment("c2")]);
    server.use(
      http.get(api("/comments/c1/replies"), () =>
        ok(
          numberedPage([
            comment("r1", { username: "dodi", replyToUsername: "citra", commentContent: "A reply" }),
          ]),
        ),
      ),
    );
    renderApp("/p/p1");

    const section = await screen.findByRole("region", { name: /Comments/ });
    const first = (await within(section).findByText("Comment c1")).closest("li") as HTMLElement;
    expect(within(first).getByText("Pinned")).toBeInTheDocument();
    // only the post's author pins
    expect(within(first).queryByRole("button", { name: "Unpin" })).not.toBeInTheDocument();

    await user.click(within(first).getByRole("button", { name: "View 2 replies" }));
    const reply = (await within(first).findByText("A reply")).closest("li") as HTMLElement;
    expect(within(reply).getByRole("link", { name: "@dodi" })).toBeInTheDocument();
    // a reply names the comment it answers
    expect(within(reply).getByRole("link", { name: "@citra" })).toHaveAttribute("href", "/u/citra");
  });

  it("adds a comment and a reply", async () => {
    postWithComments("u9", [comment("c1")]);
    const sent: unknown[] = [];
    server.use(
      http.post(api("/posts/p1/comments"), async ({ request }) => {
        sent.push(await request.json());
        return ok("CREATED");
      }),
    );
    renderApp("/p/p1");

    await user.type(await screen.findByRole("textbox", { name: "Write a comment" }), "Nice one");
    await user.click(screen.getByRole("button", { name: "Comment" }));
    await waitFor(() => {
      expect(sent).toEqual([{ content: "Nice one" }]);
    });
    expect(screen.getByRole("textbox", { name: "Write a comment" })).toHaveValue("");

    const first = (await screen.findByText("Comment c1")).closest("li") as HTMLElement;
    await user.click(within(first).getByRole("button", { name: "Reply" }));
    await user.type(within(first).getByRole("textbox", { name: "Reply to @citra" }), "Agreed");
    await user.click(within(first).getByRole("button", { name: "Send reply" }));
    await waitFor(() => {
      expect(sent).toEqual([{ content: "Nice one" }, { content: "Agreed", parentId: "c1" }]);
    });
  });

  it("lets the post's author pin a comment", async () => {
    postWithComments("u1", [comment("c1")]);
    const pins: unknown[] = [];
    server.use(
      http.put(api("/posts/p1/pinned-comment"), async ({ request }) => {
        pins.push(await request.json());
        return ok("UPDATED");
      }),
    );
    renderApp("/p/p1");

    const first = (await screen.findByText("Comment c1")).closest("li") as HTMLElement;
    await user.click(within(first).getByRole("button", { name: "Pin" }));

    await waitFor(() => {
      expect(pins).toEqual([{ commentId: "c1" }]);
    });
  });

  it("deletes a comment the user may delete, after asking", async () => {
    postWithComments("u9", [
      comment("c1", { userId: "u1", username: "ani", canDelete: true }),
      comment("c2"),
    ]);
    const deleted: string[] = [];
    server.use(
      http.delete(api("/comments/:commentId"), ({ params }) => {
        deleted.push(String(params.commentId));
        return ok("DELETED");
      }),
    );
    renderApp("/p/p1");

    const mine = (await screen.findByText("Comment c1")).closest("li") as HTMLElement;
    const theirs = screen.getByText("Comment c2").closest("li") as HTMLElement;
    expect(within(theirs).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    await user.click(within(mine).getByRole("button", { name: "Delete" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Delete this comment?" })).getByRole("button", {
        name: "Delete",
      }),
    );

    await waitFor(() => {
      expect(deleted).toEqual(["c1"]);
    });
  });
});

describe("follow", () => {
  it("follows from the profile, the count moving at once", async () => {
    server.use(
      http.get(api("/users/by-username/budi"), () =>
        ok({ id: "u-budi", username: "budi", fullName: "Budi Santoso" }),
      ),
      http.get(api("/users/u-budi/follow-status"), () =>
        ok({ followerCount: 10, followingCount: 2, isFollowing: false }),
      ),
      http.get(api("/posts/users/budi/posts"), () => ok({ content: [], last: true })),
    );
    let followed = 0;
    server.use(
      http.post(api("/users/u-budi/follow"), () => {
        followed += 1;
        return ok("CREATED");
      }),
    );
    renderApp("/u/budi");

    await user.click(await screen.findByRole("button", { name: "Follow @budi" }));

    expect(screen.getByRole("button", { name: "Unfollow @budi" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: /11 followers/ })).toBeInTheDocument();
    await waitFor(() => {
      expect(followed).toBe(1);
    });
  });

  it("is not offered on the user's own profile", async () => {
    server.use(
      http.get(api("/users/by-username/ani"), () => ok({ id: "u1", username: "ani" })),
      http.get(api("/users/u1/follow-status"), () =>
        ok({ followerCount: 0, followingCount: 0, isFollowing: false }),
      ),
      http.get(api("/posts/users/ani/posts"), () => ok({ content: [], last: true })),
    );
    renderApp("/u/ani");

    expect(await screen.findByText("No posts yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Follow/ })).not.toBeInTheDocument();
  });
});
