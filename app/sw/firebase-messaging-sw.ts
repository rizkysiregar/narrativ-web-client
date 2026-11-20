/**
 * The service worker of web push, bundled on its own by scripts/build-sw.mjs (it is not part of the app bundle).
 * Firebase Messaging receives the pushes while no tab of the app is in front, shows them, and opens the link the
 * backend put into the push (webpush.fcm_options.link) on a click. The page passes this environment's Firebase web
 * config in the registration URL (?config=...), as a service worker cannot read the page's state.
 */
import { initializeApp } from "@firebase/app";
import { getMessaging } from "@firebase/messaging/sw";

const raw = new URL(self.location.href).searchParams.get("config");
if (raw) {
  getMessaging(initializeApp(JSON.parse(raw) as Record<string, string>));
}
