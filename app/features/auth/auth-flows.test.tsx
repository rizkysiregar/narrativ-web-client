import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { endSession, startSession } from "~/api/session";
import { changeLanguage } from "~/shared/i18n";
import { fail, loginResponse, ok, onPost } from "~/test/backend";
import { renderApp } from "~/test/render-app";

const user = userEvent.setup();

async function fill(label: string | RegExp, value: string) {
  await user.type(screen.getByLabelText(label, { selector: "input" }), value);
}

async function fillRegistration(username = "ani") {
  await fill("First name", "Ani");
  await fill("Last name", "Wijaya");
  await fill("Username", username);
  await fill("Email address", "ani@example.com");
  await fill(/^Password$/, "rahasia123");
  await fill("Repeat password", "rahasia123");
}

beforeEach(async () => {
  await changeLanguage("en");
  endSession();
});

describe("sign in", () => {
  it("signs in and opens the page that asked for it", async () => {
    const bodies = onPost("/auth/login", () => ok(loginResponse()));
    renderApp("/explore");

    // no session: the app sends the visitor to the sign-in page and remembers where they were going
    await fill("Username", "ani");
    await fill(/^Password$/, "rahasia123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { name: "Explore" })).toBeInTheDocument();
    expect(bodies).toEqual([{ username: "ani", password: "rahasia123" }]);
  });

  it("shows the backend's message when it refuses", async () => {
    onPost("/auth/login", () => fail(401, "Invalid username or password", "BAD_CREDENTIALS"));
    renderApp("/login");

    await fill("Username", "ani");
    await fill(/^Password$/, "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password");
  });

  it("validates before sending anything", async () => {
    const bodies = onPost("/auth/login", () => ok(loginResponse()));
    renderApp("/login");

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Username is required")).toBeInTheDocument();
    expect(screen.getByLabelText("Username", { selector: "input" })).toHaveAttribute("aria-invalid", "true");
    expect(bodies).toHaveLength(0);
  });

  it("explains why a session ended", async () => {
    endSession("Your account has been banned by an admin. Reason: spam");
    renderApp("/login");

    expect(await screen.findByRole("alert")).toHaveTextContent("Reason: spam");
  });

  it("sends a signed-in user from the sign-in page to the app", async () => {
    startSession(loginResponse());
    renderApp("/login");

    expect(await screen.findByRole("heading", { name: "Home" })).toBeInTheDocument();
  });
});

describe("sign out", () => {
  it("revokes the session and returns to the sign-in page", async () => {
    startSession(loginResponse());
    const logouts = onPost("/auth/logout", () => ok("DELETED"));
    renderApp("/");

    await user.click(screen.getAllByRole("button", { name: "Sign out" })[0] as HTMLElement);

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(logouts).toHaveLength(1);
  });
});

describe("registration", () => {
  it("creates the account and signs in where emails are not verified", async () => {
    onPost("/auth/register/otp", () => ok({ verificationRequired: false }));
    const registrations = onPost("/auth/register", () => ok("CREATED"));
    const logins = onPost("/auth/login", () => ok(loginResponse()));
    renderApp("/register");

    await fillRegistration();
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(registrations).toEqual([
      {
        firstName: "Ani",
        lastName: "Wijaya",
        username: "ani",
        email: "ani@example.com",
        password: "rahasia123",
      },
    ]);
    expect(logins).toEqual([{ username: "ani", password: "rahasia123" }]);
  });

  it("verifies the email first where the backend asks for it", async () => {
    onPost("/auth/register/otp", () =>
      ok({
        verificationRequired: true,
        otpSendToEmailAddress: "a***@example.com",
        expirationTimeInMinute: "5",
      }),
    );
    const verifications = onPost("/auth/register/verify-otp", () => ok({ registrationToken: "token-1" }));
    const registrations = onPost("/auth/register", () => ok("CREATED"));
    onPost("/auth/login", () => ok(loginResponse()));
    renderApp("/register");

    await fillRegistration();
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText(/sent a 6-digit code to ani@example.com/)).toBeInTheDocument();
    await fill("Verification code", "123456");
    await user.click(screen.getByRole("button", { name: "Verify" }));

    expect(await screen.findByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(verifications).toEqual([{ email: "ani@example.com", otp: "123456" }]);
    expect(registrations[0]).toMatchObject({ username: "ani", registrationToken: "token-1" });
  });

  it("goes back to the form when the username is taken, without asking for the code again", async () => {
    const otps = onPost("/auth/register/otp", () =>
      ok({
        verificationRequired: true,
        otpSendToEmailAddress: "a***@example.com",
        expirationTimeInMinute: "5",
      }),
    );
    onPost("/auth/register/verify-otp", () => ok({ registrationToken: "token-1" }));
    const registrations = onPost("/auth/register", (body) =>
      body.username === "ani"
        ? fail(400, "Username is already taken", "USERNAME_ALREADY_TAKEN")
        : ok("CREATED"),
    );
    onPost("/auth/login", () => ok(loginResponse("ani2")));
    renderApp("/register");

    await fillRegistration();
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await screen.findByLabelText("Verification code", { selector: "input" });
    await fill("Verification code", "123456");
    await user.click(screen.getByRole("button", { name: "Verify" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Username is already taken");
    const username = screen.getByLabelText("Username", { selector: "input" });
    await user.clear(username);
    await user.type(username, "ani2");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(otps).toHaveLength(1);
    expect(registrations.map((body) => [body.username, body.registrationToken])).toEqual([
      ["ani", "token-1"],
      ["ani2", "token-1"],
    ]);
  });
});

describe("password reset", () => {
  it("resets the password with the emailed code and returns to sign in", async () => {
    onPost("/auth/forgot-password", () =>
      ok({ otpSendToEmailAddress: "a***@example.com", expirationTimeInMinute: "5" }),
    );
    onPost("/auth/verify-otp", () => ok({ resetToken: "reset-1" }));
    const resets = onPost("/auth/reset-password", () => ok("UPDATED"));
    renderApp("/forgot-password");

    await fill("Email address", "ani@example.com");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await screen.findByLabelText("Verification code", { selector: "input" });
    await fill("Verification code", "654321");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    await screen.findByLabelText("New password", { selector: "input" });
    await fill("New password", "baru-sekali1");
    await fill("Repeat password", "baru-sekali1");
    await user.click(screen.getByRole("button", { name: "Save password" }));

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(resets).toEqual([
      { email: "ani@example.com", resetToken: "reset-1", newPassword: "baru-sekali1" },
    ]);
    await waitFor(() => {
      expect(screen.getByText(/Your password has been changed/)).toBeInTheDocument();
    });
  });
});
