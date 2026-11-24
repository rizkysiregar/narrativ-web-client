/**
 * The service worker of web push, bundled on its own by scripts/build-sw.mjs (it is not part of the app bundle).
 * Firebase Messaging receives the pushes while no tab of the app is in front. The backend's pushes carry a
 * notification: Firebase shows them and opens the link the backend put into the push (webpush.fcm_options.link) on a
 * click. The chat service's pushes are data-only: they are shown here, and a click opens the conversation. The page
 * passes this environment's Firebase web config in the registration URL (?config=...), as a service worker cannot
 * read the page's state.
 */
import { initializeApp } from "@firebase/app";
import { getMessaging, onBackgroundMessage } from "@firebase/messaging/sw";

import { CHAT_URL_KEY, chatNotification } from "./chat-push";

// what this worker uses of ServiceWorkerGlobalScope (the project's types are the DOM's, not the worker's)
interface WindowClientLike {
  url: string;
  focus(): Promise<unknown>;
  navigate?(url: string): Promise<WindowClientLike | null>;
}
interface NotificationClickLike {
  notification: Notification;
  waitUntil(promise: Promise<unknown>): void;
}
declare const self: {
  location: Location;
  navigator: Navigator;
  registration: ServiceWorkerRegistration;
  clients: {
    matchAll(options: { type: "window"; includeUncontrolled: boolean }): Promise<WindowClientLike[]>;
    openWindow(url: string): Promise<unknown>;
  };
  addEventListener(type: "notificationclick", listener: (event: NotificationClickLike) => void): void;
};

const raw = new URL(self.location.href).searchParams.get("config");
if (raw) {
  const messaging = getMessaging(initializeApp(JSON.parse(raw) as Record<string, string>));
  // Firebase awaits what the handler returns: the push event lasts until the notification is shown, so the browser
  // does not show its own "updated in the background" one
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  onBackgroundMessage(messaging, (payload) => {
    const shown = chatNotification(payload.data, self.navigator.language);
    return shown ? self.registration.showNotification(shown.title, shown.options) : undefined;
  });
}

// Firebase handles the clicks on its own notifications and stops there; this gets the chat ones
self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data as Record<string, unknown> | null;
  const url = typeof data?.[CHAT_URL_KEY] === "string" ? data[CHAT_URL_KEY] : null;
  if (!url) {
    return;
  }
  event.notification.close();
  event.waitUntil(openChat(url));
});

/** Brings a tab of the app to the conversation, or opens one. */
async function openChat(url: string): Promise<void> {
  const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const tab = tabs.find((client) => new URL(client.url).origin === self.location.origin);
  if (tab?.navigate) {
    const moved = await tab.navigate(url).catch(() => null);
    if (moved) {
      await moved.focus();
      return;
    }
  }
  await self.clients.openWindow(url);
}
