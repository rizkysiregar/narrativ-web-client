import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startSession } from "~/api/session";
import { changeLanguage } from "~/shared/i18n";
import { loginResponse, ok } from "~/test/backend";
import { renderApp } from "~/test/render-app";
import { api, server } from "~/test/server";

const user = userEvent.setup();
const CHAT = "https://chat.test";
const CH = "ch-1";

// ---- the chat service: a WebSocket the test drives, and REST answered by msw
class FakeSocket {
  static current: FakeSocket | null = null;
  readyState = 0;
  sent: { type: string; data: Record<string, unknown> }[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  constructor() {
    FakeSocket.current = this;
    queueMicrotask(() => {
      this.readyState = 1;
      this.onopen?.();
    });
  }
  send(s: string) {
    this.sent.push(JSON.parse(s) as (typeof this.sent)[number]);
  }
  close() {
    this.readyState = 3;
  }
  push(type: string, data: unknown) {
    act(() => {
      this.onmessage?.({ data: JSON.stringify({ type, data }) });
    });
  }
}

const me = { id: "x1", external_id: "u1", name: "ani", deleted: false };
const budi = { id: "x2", external_id: "u-budi", name: "Budi", deleted: false };
const message = (seq: number, text: string, sender = budi) => ({
  id: `m${String(seq)}`,
  channel_id: CH,
  seq,
  rev_seq: seq,
  type: "text",
  sender,
  text,
  attachments: [],
  reactions: { counts: {}, mine: [] },
  created_at: new Date().toISOString(),
});
const channel = (unread: number) => ({
  id: CH,
  type: "dm",
  member_count: 2,
  dm_peer: budi,
  last_seq: 2,
  last_message_seq: 2,
  frozen: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  membership: { role: "member", unread_count: unread, last_read_seq: 0 },
  last_message: message(2, "see you tomorrow"),
  last_message_at: new Date().toISOString(),
});

function chatIsUp(options: { unread?: number } = {}) {
  const calls: string[] = [];
  server.use(
    http.post(api("/chat/token"), () =>
      ok({
        token: "chat-token",
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        apiKey: "mpk_test",
        baseUrl: CHAT,
        userId: "u1",
      }),
    ),
    http.get(`${CHAT}/v1/channels`, () =>
      HttpResponse.json({ channels: [channel(options.unread ?? 0)], next_cursor: null }),
    ),
    http.get(`${CHAT}/v1/presence`, () =>
      HttpResponse.json({ users: [{ user_id: "u-budi", online: true }] }),
    ),
    http.get(`${CHAT}/v1/channels/${CH}/messages`, () =>
      HttpResponse.json({
        messages: [message(2, "see you tomorrow"), message(1, "hi ani")],
        has_more: false,
      }),
    ),
    http.put(`${CHAT}/v1/messages/m2/reactions/:emoji`, ({ params }) => {
      calls.push(`react ${decodeURIComponent(String(params.emoji))}`);
      return HttpResponse.json({
        ...message(2, "see you tomorrow"),
        rev_seq: 3,
        reactions: { counts: { "👍": 1 }, mine: ["👍"] },
      });
    }),
  );
  return calls;
}

async function authenticate() {
  await waitFor(() => {
    expect(FakeSocket.current?.sent[0]?.type).toBe("auth");
  });
  FakeSocket.current?.push("auth.ok", { user: me, heartbeat_interval_ms: 25_000 });
}

beforeEach(async () => {
  await changeLanguage("en");
  startSession(loginResponse());
  FakeSocket.current = null;
  vi.stubGlobal("WebSocket", FakeSocket);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("chat", () => {
  it("says so, and stays out of the way, when the chat service is not available", async () => {
    renderApp("/messages");

    expect(await screen.findByText("Chat is not available")).toBeInTheDocument();
    expect(FakeSocket.current).toBeNull();
  });

  it("lists the conversations with the last message and the unread count, also on the navigation", async () => {
    chatIsUp({ unread: 2 });
    renderApp("/messages");
    await authenticate();

    const row = await screen.findByRole("link", { name: /Budi.*see you tomorrow/ });
    expect(row).toHaveAttribute("href", `/messages/${CH}`);
    expect(within(row).getByText("2 unread")).toBeInTheDocument();
    expect(await screen.findAllByRole("link", { name: /Messages, 2 unread/ })).not.toHaveLength(0);
  });

  it("shows the history, sends a message, and shows a new one from the other person", async () => {
    chatIsUp();
    renderApp(`/messages/${CH}`);
    await authenticate();

    expect(await screen.findByText("hi ani")).toBeInTheDocument();
    expect(screen.getByText("see you tomorrow")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Message" }), "on my way{Enter}");
    expect(await screen.findByText("on my way")).toBeInTheDocument(); // pending, grey
    const frame = FakeSocket.current?.sent.find((f) => f.type === "message.send");
    expect(frame?.data).toMatchObject({ channel_id: CH, text: "on my way", reply_to_id: null });
    expect(screen.getByText("Sending…")).toBeInTheDocument();

    FakeSocket.current?.push("ack", {
      message: { ...message(3, "on my way", me), client_msg_id: frame?.data.client_msg_id },
    });
    await waitFor(() => {
      expect(screen.queryByText("Sending…")).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("on my way")).toHaveLength(1);

    FakeSocket.current?.push("message.new", { message: message(4, "great") });
    expect(await screen.findByText("great")).toBeInTheDocument();
  });

  it("reacts to a message", async () => {
    const calls = chatIsUp();
    renderApp(`/messages/${CH}`);
    await authenticate();
    await screen.findByText("see you tomorrow");

    const bubble = screen.getByText("see you tomorrow").closest(".group") as HTMLElement;
    await user.click(within(bubble).getByRole("button", { name: "React with 👍" }));

    await waitFor(() => {
      expect(calls).toEqual(["react 👍"]);
    });
    expect(await within(bubble).findByRole("button", { name: "👍 1", pressed: true })).toBeInTheDocument();
  });

  it("opens the direct message from a profile", async () => {
    chatIsUp();
    server.use(
      http.get(api("/users/by-username/budi"), () =>
        ok({ id: "u-budi", username: "budi", fullName: "Budi Santoso" }),
      ),
      http.get(api("/users/u-budi/follow-status"), () =>
        ok({ followerCount: 1, followingCount: 1, isFollowing: false }),
      ),
      http.get(api("/posts/users/budi/posts"), () => ok({ content: [], last: true, pageNumber: 0 })),
      http.post(api("/chat/dm/u-budi"), () => ok({ channelId: CH })),
    );
    renderApp("/u/budi");
    await authenticate();

    await user.click(await screen.findByRole("button", { name: "Message" }));

    expect(await screen.findByText("hi ani")).toBeInTheDocument();
  });
  it("is hidden and never connects while an admin has chat switched off", async () => {
    chatIsUp();
    let tokenAsked = false;
    server.use(
      http.get(api("/config/client"), () => ok({ features: { chat: false } })),
      http.post(api("/chat/token"), () => {
        tokenAsked = true;
        return ok({});
      }),
    );
    renderApp("/messages");

    // the messages page sends the user to the home feed, and the menu has no messages entry
    expect(await screen.findAllByRole("link", { name: "Home" })).not.toHaveLength(0);
    await waitFor(() => {
      expect(screen.queryByRole("link", { name: /^Messages/ })).not.toBeInTheDocument();
    });
    expect(screen.queryByText("Chat is not available")).not.toBeInTheDocument();
    expect(tokenAsked).toBe(false);
    expect(FakeSocket.current).toBeNull();
    expect(localStorage.getItem("narrativ:feature:chat")).toBe("false");
  });

  it("hides the message button on profiles while an admin has chat switched off", async () => {
    // the chat service itself is up: only the switch keeps the button away
    chatIsUp();
    server.use(
      http.get(api("/config/client"), () => ok({ features: { chat: false } })),
      http.get(api("/users/by-username/budi"), () =>
        ok({ id: "u-budi", username: "budi", fullName: "Budi Santoso" }),
      ),
      http.get(api("/users/u-budi/follow-status"), () =>
        ok({ followerCount: 1, followingCount: 1, isFollowing: false }),
      ),
      http.get(api("/posts/users/budi/posts"), () => ok({ content: [], last: true, pageNumber: 0 })),
    );
    renderApp("/u/budi");

    expect(await screen.findByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Message" })).not.toBeInTheDocument();
  });
});
