import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { startSession } from "~/api/session";
import { changeLanguage } from "~/shared/i18n";
import { loginResponse, ok } from "~/test/backend";
import { post } from "~/test/fixtures";
import { renderApp } from "~/test/render-app";
import { api, server } from "~/test/server";

const user = userEvent.setup();

const entries = [
  {
    groupKey: "like:p1:2026-11-20",
    type: "POST_LIKED",
    actors: [
      { id: "a1", username: "budi" },
      { id: "a2", username: "citra" },
    ],
    actorCount: 4,
    postId: "p1",
    createdAt: new Date().toISOString(),
    unread: true,
  },
  {
    groupKey: "follow:a3",
    type: "FOLLOWED",
    actors: [{ id: "a3", username: "dodi" }],
    actorCount: 1,
    createdAt: new Date().toISOString(),
    unread: false,
  },
];

beforeEach(async () => {
  await changeLanguage("en");
  startSession(loginResponse());
  server.use(
    http.get(api("/users/me/notifications"), () => ok({ content: entries, last: true })),
    http.get(api("/users/me/notifications/unread-count"), () => ok({ unread: 1 })),
  );
});

describe("inbox", () => {
  it("groups actors, shows the unread badge and links to what happened", async () => {
    renderApp("/notifications");

    const like = await screen.findByRole("link", { name: /@budi and 3 others liked your post/ });
    expect(like).toHaveAttribute("href", "/p/p1");
    expect(within(like).getByLabelText("Unread")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /@dodi started following you/ })).toHaveAttribute(
      "href",
      "/u/dodi",
    );
    expect(await screen.findAllByRole("link", { name: /Notifications, 1 unread/ })).not.toHaveLength(0);
  });

  it("marks an entry read when it is opened", async () => {
    const read: unknown[] = [];
    server.use(
      http.post(api("/users/me/notifications/read"), async ({ request }) => {
        read.push(await request.json());
        return ok("UPDATED");
      }),
      http.get(api("/posts/p1"), () => ok(post({ id: "p1", caption: "Liked post" }))),
      http.get(api("/posts/p1/comments"), () => ok({ content: [], last: true, pageNumber: 0 })),
    );
    renderApp("/notifications");

    await user.click(await screen.findByRole("link", { name: /liked your post/ }));

    expect(await screen.findByText("Liked post")).toBeInTheDocument();
    expect(read).toEqual([{ groupKey: "like:p1:2026-11-20" }]);
  });

  it("marks everything read", async () => {
    let calls = 0;
    server.use(
      // like the backend: once read, the inbox answers the entries read
      http.get(api("/users/me/notifications"), () =>
        ok({
          content: entries.map((entry) => ({ ...entry, unread: entry.unread && calls === 0 })),
          last: true,
        }),
      ),
      http.post(api("/users/me/notifications/read-all"), () => {
        calls += 1;
        return ok("UPDATED");
      }),
    );
    renderApp("/notifications");

    await user.click(await screen.findByRole("button", { name: "Mark all as read" }));

    await waitFor(() => {
      expect(calls).toBe(1);
    });
    expect(screen.queryByLabelText("Unread")).not.toBeInTheDocument();
  });
});
