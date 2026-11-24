import { isMarpokatPush } from "@rizkysiregar/marpokat-core";

import { api } from "~/api/client";
import { request } from "~/api/errors";
import type { Schemas } from "~/api/types";
import { APP_VERSION } from "~/shared/config/env";
import { currentLanguage } from "~/shared/i18n";
import { readPreference, writePreference } from "~/shared/lib/storage";

export type WebPushConfig = Schemas["WebPushConfigResponse"];

// the token this browser registered with the backend, to deactivate it on sign-out or when push is turned off
const TOKEN_KEY = "narrativ.pushToken";
// a random id of this browser, so the backend sees one device however often its token rotates
const DEVICE_KEY = "narrativ.deviceId";
const loadFirebase = () => import("./firebase");

/** Told the token once it is registered (again), and null with the old one before it is removed. */
type TokenListener = (token: string | null, previous: string | null) => void | Promise<void>;
const tokenListeners = new Set<TokenListener>();

/** The push token of this browser while push is on, else null. */
export function currentPushToken(): string | null {
  return pushState() === "on" ? readPreference(TOKEN_KEY) : null;
}

/**
 * For other services that push to this browser (chat): follows the token. Removal waits for the listeners, so on
 * sign-out they can still remove it with the session they have.
 */
export function onPushTokenChange(listener: TokenListener): () => void {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

async function tellListeners(token: string | null, previous: string | null): Promise<void> {
  await Promise.allSettled([...tokenListeners].map(async (listener) => listener(token, previous)));
}

export type PushState = "unsupported" | "denied" | "off" | "on";

export function pushState(): PushState {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  if (Notification.permission === "denied") {
    return "denied";
  }
  return Notification.permission === "granted" && readPreference(TOKEN_KEY) !== null ? "on" : "off";
}

function firebaseConfig(config: WebPushConfig) {
  return {
    apiKey: config.apiKey ?? "",
    projectId: config.projectId ?? "",
    messagingSenderId: config.messagingSenderId ?? "",
    appId: config.appId ?? "",
  };
}

function deviceId(): string {
  const known = readPreference(DEVICE_KEY);
  if (known) {
    return known;
  }
  const created = crypto.randomUUID();
  writePreference(DEVICE_KEY, created);
  return created;
}

/**
 * Gets this browser's push token from Firebase (through the service worker) and registers it with the backend.
 *
 * getToken/deleteToken are deprecated in favour of Firebase Installation ID registration (register/onRegistered),
 * which the backend would have to target differently. The backend and the Android app send to FCM registration
 * tokens, so the web does the same until both move to FID together (noted in docs/PLAN.md).
 */
async function registerToken(config: WebPushConfig): Promise<void> {
  const registration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?config=${encodeURIComponent(JSON.stringify(firebaseConfig(config)))}`,
  );
  const { getToken, messaging } = await loadFirebase();
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- see the comment above
  const token = await getToken(messaging(firebaseConfig(config)), {
    vapidKey: config.vapidKey ?? "",
    serviceWorkerRegistration: registration,
  });
  await request(
    api.POST("/devices", {
      body: {
        pushToken: token,
        platform: "WEB",
        deviceId: deviceId(),
        appVersion: APP_VERSION,
        locale: currentLanguage(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    }),
  );
  const previous = readPreference(TOKEN_KEY);
  writePreference(TOKEN_KEY, token);
  await tellListeners(token, previous);
}

export class PushPermissionError extends Error {
  override readonly name = "PushPermissionError";
}

/** Asks the browser for permission (only ever after the user asked for it) and turns push on. */
export async function enablePush(config: WebPushConfig): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new PushPermissionError(permission);
  }
  await registerToken(config);
}

/**
 * At start-up, where push is on: tokens rotate, so the current one is registered again (the backend updates the
 * device). Never asks for permission.
 */
export async function syncPush(config: WebPushConfig): Promise<void> {
  if (pushState() === "on") {
    await registerToken(config);
  }
}

/** Stops push for this browser: the backend deactivates the token, Firebase forgets it. Never fails. */
export async function disablePush(config?: WebPushConfig): Promise<void> {
  const token = readPreference(TOKEN_KEY);
  if (token === null) {
    return;
  }
  await tellListeners(null, token);
  await request(api.POST("/devices/deactivate", { body: { pushToken: token } })).catch(() => undefined);
  if (config?.enabled) {
    const { deleteToken, messaging } = await loadFirebase();
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- see registerToken
    await deleteToken(messaging(firebaseConfig(config))).catch(() => false);
  }
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // nothing stored to remove
  }
}

/** Pushes that arrive while a tab of the app is in front (Firebase shows only the others). */
export function onForegroundPush(
  config: WebPushConfig,
  handle: (title: string, body: string) => void,
): () => void {
  let stopped = false;
  let unsubscribe: (() => void) | undefined;
  void loadFirebase().then(({ messaging, onMessage }) => {
    if (stopped) {
      return;
    }
    unsubscribe = onMessage(messaging(firebaseConfig(config)), (payload) => {
      // chat messages reach an open app over its live connection, with its own banner
      if (isMarpokatPush(payload.data)) {
        return;
      }
      handle(payload.notification?.title ?? "", payload.notification?.body ?? "");
    });
  });
  return () => {
    stopped = true;
    unsubscribe?.();
  };
}
