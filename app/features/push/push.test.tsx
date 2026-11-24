import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
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
    | ((payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void)
    | undefined,
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

describe("push notifications of the chat service", () => {
  const CHAT = "https://chat.test";

  /** The chat service is up: it hands out a token, its socket never answers, and its device calls are recorded. */
  function chatServiceUp() {
    const calls: string[] = [];
    vi.stubGlobal(
      "WebSocket",
      class {
        readyState = 0;
        send = vi.fn();
        close = vi.fn();
      },
    );
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
      http.post(`${CHAT}/v1/devices`, async ({ request }) => {
        const body = (await request.json()) as { platform: string; push_token: string };
        calls.push(`register ${body.platform} ${body.push_token}`);
        return new HttpResponse(null, { status: 204 });
      }),
      http.delete(`${CHAT}/v1/devices/:token`, ({ params }) => {
        calls.push(`remove ${String(params.token)}`);
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(api("/auth/logout"), () => {
        calls.push("backend sign-out");
        return ok("DELETED");
      }),
    );
    return calls;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("get the browser's token once push is on, at every start", async () => {
    browserWithPush("granted");
    localStorage.setItem("narrativ.pushToken", "web-token-1");
    devicesEndpoints();
    const calls = chatServiceUp();
    renderApp("/");

    await waitFor(() => {
      expect(calls).toEqual(["register web web-token-1"]); // once, though the start registers the token again
    });
  });

  it("get the token when push is turned on in settings, and lose it when it is turned off", async () => {
    browserWithPush("default");
    devicesEndpoints();
    const calls = chatServiceUp();
    renderApp("/settings");

    await user.click(await screen.findByRole("button", { name: "Turn on" }));
    await waitFor(() => {
      expect(calls).toEqual(["register web web-token-1"]);
    });
    await user.click(await screen.findByRole("button", { name: "Turn off" }));
    await waitFor(() => {
      expect(calls).toEqual(["register web web-token-1", "remove web-token-1"]);
    });
  });

  it("are not sent to a browser after sign-out: the token goes while the session still exists", async () => {
    browserWithPush("granted");
    localStorage.setItem("narrativ.pushToken", "web-token-1");
    devicesEndpoints();
    const calls = chatServiceUp();
    renderApp("/");
    await waitFor(() => {
      expect(calls).toContain("register web web-token-1");
    });

    await user.click(screen.getAllByRole("button", { name: "Sign out" })[0] as HTMLElement);

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(calls).toEqual(["register web web-token-1", "remove web-token-1", "backend sign-out"]);
  });

  it("are not toasted while the app is open: the conversation shows new messages itself", async () => {
    browserWithPush("granted");
    localStorage.setItem("narrativ.pushToken", "web-token-1");
    devicesEndpoints();
    renderApp("/");
    await waitFor(() => {
      expect(firebase.foreground).toBeDefined();
    });

    firebase.foreground?.({ data: { marpokat: "1", type: "message.new", channel_id: "c", message_id: "m" } });
    firebase.foreground?.({ notification: { title: "@budi liked your post", body: "Sunset" } });

    expect(await screen.findByText("@budi liked your post")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-sonner-toast]")).toHaveLength(1); // only the backend's
  });
});
