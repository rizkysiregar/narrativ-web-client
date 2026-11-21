import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { endSession, startSession, useSession } from "~/api/session";
import { changeLanguage } from "~/shared/i18n";
import { fail, loginResponse, ok, onPost } from "~/test/backend";
import { renderApp } from "~/test/render-app";
import { api, server } from "~/test/server";

import { GIS_SCRIPT, type ButtonConfiguration, type IdConfiguration } from "./gis";

const user = userEvent.setup();
const CLIENT_ID = "web-client.apps.googleusercontent.com";

/**
 * A stand-in for Google Identity Services: renderButton draws a plain button, and clicking it hands the page a
 * Google ID token the way the real popup does.
 */
function fakeGoogle() {
  let config: IdConfiguration | undefined;
  const buttons: ButtonConfiguration[] = [];
  window.google = {
    accounts: {
      id: {
        initialize: (next) => {
          config = next;
        },
        renderButton: (parent, options) => {
          buttons.push(options);
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = `Google: ${options.text ?? ""}`;
          button.addEventListener("click", () => {
            config?.callback({ credential: "google-id-token" });
          });
          parent.replaceChildren(button);
        },
      },
    },
  };
  return { config: () => config, buttons };
}

function googleEnabled() {
  server.use(http.get(api("/auth/google-config"), () => ok({ enabled: true, clientId: CLIENT_ID })));
}

beforeEach(async () => {
  await changeLanguage("en");
  endSession();
});

afterEach(() => {
  delete window.google;
  document.head.querySelectorAll(`script[src="${GIS_SCRIPT}"]`).forEach((script) => {
    script.remove();
  });
});

describe("sign in with Google", () => {
  it("signs in with the Google ID token and opens the app", async () => {
    googleEnabled();
    const google = fakeGoogle();
    const bodies = onPost("/auth/google", () => ok(loginResponse("ani.google")));
    renderApp("/login");

    await user.click(await screen.findByRole("button", { name: "Google: signin_with" }));

    expect(await screen.findByText("Your feed is waiting")).toBeInTheDocument();
    expect(bodies).toEqual([{ idToken: "google-id-token" }]);
    expect(useSession.getState().user?.username).toBe("ani.google");
    expect(google.config()).toMatchObject({ client_id: CLIENT_ID, context: "signin", ux_mode: "popup" });
    expect(google.buttons[0]).toMatchObject({ locale: "en", theme: "filled_black" });
  });

  it("offers signing up with Google on the registration page", async () => {
    googleEnabled();
    const google = fakeGoogle();
    const bodies = onPost("/auth/google", () => ok(loginResponse()));
    renderApp("/register");

    await user.click(await screen.findByRole("button", { name: "Google: signup_with" }));

    expect(await screen.findByText("Your feed is waiting")).toBeInTheDocument();
    expect(bodies).toHaveLength(1);
    expect(google.config()?.context).toBe("signup");
  });

  it("shows why the backend refused the Google account", async () => {
    googleEnabled();
    fakeGoogle();
    onPost("/auth/google", () => fail(401, "The Google sign-in could not be verified", "UNAUTHORIZED"));
    renderApp("/login");

    await user.click(await screen.findByRole("button", { name: "Google: signin_with" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The Google sign-in could not be verified");
    expect(useSession.getState().user).toBeNull();
  });

  it("shows no Google button where the environment has no client id", async () => {
    fakeGoogle();
    renderApp("/login");

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("separator", { name: "or" })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /^Google:/ })).not.toBeInTheDocument();
  });

  it("loads Google's script on demand and explains when it cannot", async () => {
    googleEnabled();
    renderApp("/login");

    // jsdom loads no external scripts: fail it the way a blocker or no connection does
    const script = await vi.waitFor(() => {
      const found = document.head.querySelector(`script[src="${GIS_SCRIPT}"]`);
      expect(found).not.toBeNull();
      return found as HTMLScriptElement;
    });
    fireEvent.error(script);

    expect(await screen.findByText(/Sign in with Google is not available right now/)).toBeInTheDocument();
    // the password form keeps working
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });
});

describe("confirming with Google instead of a password", () => {
  beforeEach(() => {
    startSession(loginResponse());
    server.use(http.get(api("/users/me"), () => ok({ id: "u1", username: "ani", email: "ani@example.com" })));
    googleEnabled();
    fakeGoogle();
  });

  it("deletes a Google account with a fresh Google ID token", async () => {
    const deletions = onPost("/users/me/deletion", () => ok("DELETED"));
    renderApp("/settings/delete-account");

    expect(await screen.findByText(/Signed up with Google\?/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Google: continue_with" }));

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(deletions).toEqual([{ idToken: "google-id-token" }]);
  });

  it("changes the email with the code and the Google account, but only once the code is filled in", async () => {
    onPost("/users/me/email/otp", () => ok({ expirationTimeInMinute: "5" }));
    const confirms = onPost("/users/me/email", () => ok(loginResponse()));
    renderApp("/settings/email");

    await user.type(await screen.findByLabelText("New email", { selector: "input" }), "new@example.com");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    const google = await screen.findByRole("button", { name: "Google: continue_with" });

    await user.click(google);
    expect(await screen.findByText("Enter the 6-digit code")).toBeInTheDocument();
    expect(confirms).toHaveLength(0);

    await user.type(screen.getByLabelText("Verification code", { selector: "input" }), "123456");
    await user.click(google);

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(confirms).toEqual([{ email: "new@example.com", otp: "123456", idToken: "google-id-token" }]);
  });
});
