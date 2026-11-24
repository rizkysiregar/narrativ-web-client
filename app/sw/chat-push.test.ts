import { describe, expect, it } from "vitest";

import { CHAT_URL_KEY, chatNotification } from "./chat-push";

const push = {
  marpokat: "1",
  type: "message.new",
  channel_id: "ch-1",
  channel_type: "dm",
  channel_name: "",
  message_id: "m-1",
  seq: "5",
  sender_id: "u-budi",
  sender_name: "Budi",
  sender_avatar_url: "",
  text: "see you tomorrow",
  attachment_kind: "",
  unread_count: "2",
};

describe("chat pushes in the service worker", () => {
  it("show the sender and the text, and open the conversation", () => {
    expect(chatNotification(push, "en-US")).toEqual({
      title: "Budi",
      options: {
        body: "see you tomorrow",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "chat:ch-1",
        data: { [CHAT_URL_KEY]: "/messages/ch-1" },
      },
    });
  });

  it("title a group with its name, and use the sender's picture when there is one", () => {
    const n = chatNotification(
      {
        ...push,
        channel_type: "group",
        channel_name: "Book club",
        sender_avatar_url: "https://cdn.test/b.png",
      },
      "en",
    );
    expect(n?.title).toBe("Book club");
    expect(n?.options.icon).toBe("https://cdn.test/b.png");
  });

  it("say what a message without text carries, in the browser's language", () => {
    expect(chatNotification({ ...push, text: "", attachment_kind: "image" }, "id-ID")?.options.body).toBe(
      "Foto",
    );
    expect(chatNotification({ ...push, text: "", attachment_kind: "file" }, "en")?.options.body).toBe("File");
    expect(chatNotification({ ...push, text: "", attachment_kind: "" }, "en")?.options.body).toBe(
      "New message",
    );
  });

  it("leave the backend's pushes alone", () => {
    expect(chatNotification({ type: "POST_LIKED", postId: "p1" }, "en")).toBeNull();
    expect(chatNotification(undefined, "en")).toBeNull();
  });
});
