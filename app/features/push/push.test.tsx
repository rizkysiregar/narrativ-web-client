import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startSession } from "~/api/session";
import { changeLanguage } from "~/shared/i18n";
import { loginResponse, ok } from "~/test/backend";
import { renderApp } from "~/test/render-app";
import { api, server } from "~/test/server";

const firebase = vi.hoisted(() => ({
  getToken: vi.fn(() => Promise.resolve("web-token-1")),
  deleteToken: vi.fn(() => Promise.resolve(true)),
  foreground: undefined as
    ((payload: { notification?: { title?: string; body?: string } }) => void) | undefined,
}));

vi.mock("@firebase/app", () => ({ getApps: () => [], initializeApp: () => ({ name: "narrativ-push" }) }));
vi.mock("@firebase/messaging", () => ({
  getMessaging: () => ({}),
  getToken: firebase.getToken,
  deleteToken: firebase.deleteToken,
  onMessage: (_messaging: unknown, next: typeof firebase.foreground) => {
    firebase.foreground = next;
    return () => undefined;
  },
}));

const user = userEvent.setup();
const config = {
  enabled: true,
  apiKey: "k",
  projectId: "p",
  messagingSenderId: "1",
  appId: "a",
  vapidKey: "v",
};

/** What a browser with push offers, in jsdom: permission `permission`, answering requests with `answer`. */
function browserWithPush(permission: NotificationPermission, answer: NotificationPermission = "granted") {
  const notification = {
    permission,
    // like a browser: the answer becomes the permission
    requestPermission: vi.fn(() => {
      notification.permission = answer;
      return Promise.resolve(answer);
    }),
  };
  Object.defineProperty(window, "Notification", { value: notification, configurable: true });
  // only its presence is checked
  Object.defineProperty(window, "PushManager", { value: Object, configurable: true });
  const register = vi.fn(() => Promise.resolve({}));
  Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });
  return { notification, register };
}

function devicesEndpoints() {
  const registered: Record<string, unknown>[] = [];
  const deactivated: unknown[] = [];
  server.use(
    http.get(api("/devices/web-push-config"), () => ok(config)),
    http.post(api("/devices"), async ({ request }) => {
      registered.push((await request.json()) as Record<string, unknown>);
      return ok("CREATED");
    }),
    http.post(api("/devices/deactivate"), async ({ request }) => {
      deactivated.push(await request.json());
      return ok("DELETED");
    }),
  );
  return { registered, deactivated };
}

beforeEach(async () => {
  await changeLanguage("en");
  startSession(loginResponse());
  server.use(http.get(api("/users/me/notifications"), () => ok({ content: [], last: true })));
});

afterEach(() => {
  for (const name of ["Notification", "PushManager"]) {
    Reflect.deleteProperty(window, name);
  }
  Reflect.deleteProperty(navigator, "serviceWorker");
  localStorage.clear();
});

describe("push notifications", () => {
  it("turn on from settings: permission, service worker with the config, token registered as WEB", async () => {
    const { notification, register } = browserWithPush("default");
    const { registered } = devicesEndpoints();
    renderApp("/settings");

    await user.click(await screen.findByRole("button", { name: "Turn on" }));

    expect(await screen.findByRole("button", { name: "Turn off" })).toBeInTheDocument();
    expect(notification.requestPermission).toHaveBeenCalled();
    expect(register).toHaveBeenCalledWith(
      expect.stringMatching(/^\/firebase-messaging-sw\.js\?config=.*%22projectId%22%3A%22p%22/),
    );
    expect(firebase.getToken).toHaveBeenCalledWith({}, { vapidKey: "v", serviceWorkerRegistration: {} });
    expect(registered[0]).toMatchObject({
      pushToken: "web-token-1",
      platform: "WEB",
      appVersion: "0.0.0-test",
    });
    expect(registered[0]?.deviceId).toEqual(expect.any(String));
  });

  it("turn off again: the backend deactivates the token", async () => {
    browserWithPush("granted");
    localStorage.setItem("narrativ.pushToken", "web-token-1");
    const { deactivated } = devicesEndpoints();
    renderApp("/settings");

    await user.click(await screen.findByRole("button", { name: "Turn off" }));

    expect(await screen.findByRole("button", { name: "Turn on" })).toBeInTheDocument();
    expect(deactivated).toEqual([{ pushToken: "web-token-1" }]);
    expect(firebase.deleteToken).toHaveBeenCalled();
  });

  it("explain a permission the user blocked", async () => {
    browserWithPush("denied");
    devicesEndpoints();
    renderApp("/settings");

    expect(await screen.findByText(/Blocked in the browser settings/)).toBeInTheDocument();
  });

  it("are not offered where the environment has no web push", async () => {
    browserWithPush("default");
    server.use(http.get(api("/devices/web-push-config"), () => ok({ enabled: false })));
    renderApp("/settings");

    expect(await screen.findByText("Not available in this browser.")).toBeInTheDocument();
  });

  it("are offered on the notifications page, and 'Not now' hides the offer", async () => {
    browserWithPush("default");
    devicesEndpoints();
    renderApp("/notifications");

    expect(await screen.findByText(/Get notified in this browser/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByText(/Get notified in this browser/)).not.toBeInTheDocument();
  });

  it("stop with sign-out", async () => {
    browserWithPush("granted");
    localStorage.setItem("narrativ.pushToken", "web-token-1");
    const { deactivated } = devicesEndpoints();
    server.use(http.post(api("/auth/logout"), () => ok("DELETED")));
    renderApp("/");

    await screen.findByRole("heading", { name: "Home" });
    await user.click(screen.getAllByRole("button", { name: "Sign out" })[0] as HTMLElement);

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(deactivated).toEqual([{ pushToken: "web-token-1" }]);
  });

  it("show a push that arrives while the app is open, and register the token again at start", async () => {
    browserWithPush("granted");
    localStorage.setItem("narrativ.pushToken", "old-token");
    const { registered } = devicesEndpoints();
    renderApp("/");

    await waitFor(() => {
      expect(registered.map((body) => body.pushToken)).toEqual(["web-token-1"]);
    });
    firebase.foreground?.({ notification: { title: "@budi liked your post", body: "Sunset" } });

    expect(await screen.findByText("@budi liked your post")).toBeInTheDocument();
  });
});
