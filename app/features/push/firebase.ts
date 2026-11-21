// The Firebase SDK, loaded only when push is actually used (turning it on or off, or a browser where it is on): most
// pages and every visitor who never turned push on download none of it.
import { getApps, initializeApp, type FirebaseOptions } from "@firebase/app";
import { getMessaging, type Messaging } from "@firebase/messaging";

// getToken/deleteToken are deprecated, see registerToken in push.ts for why they are still used
// eslint-disable-next-line @typescript-eslint/no-deprecated
export { deleteToken, getToken, onMessage } from "@firebase/messaging";

const APP_NAME = "narrativ-push";

export function messaging(options: FirebaseOptions): Messaging {
  const app = getApps().find((existing) => existing.name === APP_NAME) ?? initializeApp(options, APP_NAME);
  return getMessaging(app);
}
