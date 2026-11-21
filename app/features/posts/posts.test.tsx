import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { startSession } from "~/api/session";
import { changeLanguage } from "~/shared/i18n";
import { fail, loginResponse, ok } from "~/test/backend";
import { feedPage, post } from "~/test/fixtures";
import { renderApp } from "~/test/render-app";
import { api, server } from "~/test/server";

const user = userEvent.setup();

beforeEach(async () => {
  await changeLanguage("en");
  startSession(loginResponse());
});

describe("home feed", () => {
  it("shows the posts and loads the next page with the cursor", async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get(api("/posts"), ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        cursors.push(cursor);
        return cursor === null
          ? ok(feedPage([post({ caption: "First page story" })], "cursor-2"))
          : ok(feedPage([post({ caption: "Second page story", suggested: true })]));
      }),
    );
    renderApp("/");

    expect(await screen.findByText("First page story")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show more" }));

    const second = (await screen.findByText("Second page story")).closest("article");
    expect(second).not.toBeNull();
    expect(within(second as HTMLElement).getByText("Suggested")).toBeInTheDocument();
    expect(cursors).toEqual([null, "cursor-2"]);
    // the last page answers no cursor: nothing more to load
    expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  });

  it("invites to follow people when the feed is empty", async () => {
    renderApp("/");

    expect(await screen.findByText("Your feed is waiting")).toBeInTheDocument();
  });

  it("offers a retry when the feed cannot be loaded", async () => {
    let calls = 0;
    server.use(
      http.get(api("/posts"), () => {
        calls += 1;
        return calls === 1
          ? fail(400, "Something is off", "BAD_REQUEST")
          : ok(feedPage([post({ caption: "Back again" })]));
      }),
    );
    renderApp("/");

    expect(await screen.findByRole("alert")).toHaveTextContent("Something is off");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Back again")).toBeInTheDocument();
  });
});

describe("post card", () => {
  it("shows author, time, counts and media", async () => {
    server.use(
      http.get(api("/posts/explore"), () =>
        ok(
          feedPage([
            post({
              username: "budi",
              likeCount: 1234,
              liked: true,
              media: [
                { id: "m1", type: "IMAGE", url: "https://media.test/1.jpg" },
                {
                  id: "m2",
                  type: "VIDEO",
                  url: "https://media.test/2.mp4",
                  thumbnailUrl: "https://media.test/2.jpg",
                },
              ],
            }),
          ]),
        ),
      ),
    );
    renderApp("/explore");

    const card = (await screen.findByRole("link", { name: "@budi" })).closest("article") as HTMLElement;
    expect(within(card).getByText("5 min. ago")).toBeInTheDocument();
    const like = within(card).getByRole("button", { name: "Like, 1234 likes" });
    expect(like).toHaveTextContent("1.2K");
    expect(within(card).getByRole("img", { name: "Media 1 of 2 by @budi" })).toHaveAttribute(
      "src",
      "https://media.test/1.jpg",
    );
    expect(within(card).getByLabelText("Media 2 of 2 by @budi")).toHaveAttribute(
      "poster",
      "https://media.test/2.jpg",
    );
    expect(card.querySelector("[data-post-link]")).toHaveAttribute("href", expect.stringMatching(/^\/p\//));
  });

  it("marks a taken down post", async () => {
    server.use(
      http.get(api("/posts/explore"), () =>
        ok(feedPage([post({ caption: undefined, moderationStatus: "TAKEN_DOWN", takedownReason: "Spam" })])),
      ),
    );
    renderApp("/explore");

    expect(await screen.findByText(/taken down by a moderator\. Reason: Spam/)).toBeInTheDocument();
  });
});

describe("post page", () => {
  it("shows the post", async () => {
    server.use(
      http.get(api("/posts/post-42"), () => ok(post({ id: "post-42", caption: "Opened on its own" }))),
    );
    renderApp("/p/post-42");

    expect(await screen.findByText("Opened on its own")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Post" })).toBeInTheDocument();
  });

  it("explains a post that is gone", async () => {
    server.use(http.get(api("/posts/gone"), () => fail(404, "Not found", "NOT_FOUND")));
    renderApp("/p/gone");

    expect(await screen.findByRole("heading", { name: "Post not available" })).toBeInTheDocument();
  });
});

describe("expired media", () => {
  it("fetches the feed again when an image fails to load", async () => {
    let calls = 0;
    server.use(
      http.get(api("/posts"), () => {
        calls += 1;
        return ok(
          feedPage([post({ media: [{ id: "m1", type: "IMAGE", url: `https://media.test/${calls}.jpg` }] })]),
        );
      }),
    );
    renderApp("/");

    const image = await screen.findByRole("img", { name: /Media 1 of 1/ });
    fireEvent.error(image);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: /Media 1 of 1/ })).toHaveAttribute(
        "src",
        "https://media.test/2.jpg",
      );
    });
    // more images failing right after still fetch the feed only once a minute
    fireEvent.error(screen.getByRole("img", { name: /Media 1 of 1/ }));
    expect(calls).toBe(2);
  });
});
