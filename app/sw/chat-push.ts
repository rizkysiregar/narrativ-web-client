/**
 * Chat pushes in the service worker. The chat service (Marpokat) sends data-only pushes, so unlike the backend's
 * pushes nothing shows them by itself: this turns one into a notification. Kept apart from the worker so it can be
 * tested, and small: it only uses the SDK's parser, not the chat client.
 */
import { parsePush } from "@rizkysiregar/marpokat-core";

/** Where the notification's click goes; read back by the worker's notificationclick handler. */
export const CHAT_URL_KEY = "narrativChatUrl";

// the worker cannot read the language chosen in the app (localStorage): the browser's is the closest it has
const LABELS = {
  en: { image: "Photo", video: "Video", file: "File", fallback: "New message" },
  id: { image: "Foto", video: "Video", file: "Berkas", fallback: "Pesan baru" },
} as const;

export interface ChatNotification {
  title: string;
  options: NotificationOptions;
}

/** The notification of a chat push, or null when the push is not one (the backend's pushes show themselves). */
export function chatNotification(
  data: Record<string, string> | undefined,
  language: string,
): ChatNotification | null {
  const push = parsePush(data);
  if (!push) {
    return null;
  }
  const labels = language.toLowerCase().startsWith("id") ? LABELS.id : LABELS.en;
  const kind = push.attachmentKind as keyof typeof labels | null;
  const body = push.text || (kind && kind in labels ? labels[kind] : "") || labels.fallback;
  return {
    title: push.title || labels.fallback,
    options: {
      body,
      icon: push.senderAvatarUrl ?? "/icon-192.png",
      badge: "/icon-192.png",
      // one notification per conversation, replaced by its newest message
      tag: `chat:${push.channelId}`,
      data: { [CHAT_URL_KEY]: `/messages/${encodeURIComponent(push.channelId)}` },
    },
  };
}
