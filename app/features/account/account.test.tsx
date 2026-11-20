import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { startSession, useSession } from "~/api/session";
import { changeLanguage } from "~/shared/i18n";
import { loginResponse, ok } from "~/test/backend";
import { renderApp } from "~/test/render-app";
import { api, server } from "~/test/server";

const user = userEvent.setup();

const me = { id: "u1", username: "ani", firstName: "Ani", lastName: "Wijaya", email: "ani@example.com" };

beforeEach(async () => {
  await changeLanguage("en");
  startSession(loginResponse());
  server.use(http.get(api("/users/me"), () => ok(me)));
});

describe("settings", () => {
  it("lists the settings and signs out from there", async () => {
    const logouts: number[] = [];
    server.use(
      http.post(api("/auth/logout"), () => {
        logouts.push(1);
        return ok("DELETED");
      }),
    );
    renderApp("/settings");

    for (const name of ["Edit profile", "Change email", "Blocked accounts", "Delete account"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Privacy policy" })).toHaveAttribute(
      "href",
      "https://narrativ.rizkysiregar.my.id/en/privacy",
    );
    await user.click(screen.getAllByRole("button", { name: "Sign out" }).at(-1) as HTMLElement);
    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(logouts).toHaveLength(1);
  });
});

describe("edit profile", () => {
  it("saves the names and username, and the session follows the new username", async () => {
    const patches: unknown[] = [];
    server.use(
      http.patch(api("/users/me"), async ({ request }) => {
        const body = (await request.json()) as Record<string, string>;
        patches.push(body);
        return ok({ ...me, ...body });
      }),
    );
    renderApp("/settings/profile");

    const username = await screen.findByLabelText("Username", { selector: "input" });
    expect(username).toHaveValue("ani");
    await user.clear(username);
    await user.type(username, "ani.w");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Profile saved")).toBeInTheDocument();
    expect(patches).toEqual([{ firstName: "Ani", lastName: "Wijaya", username: "ani.w" }]);
    expect(useSession.getState().user?.username).toBe("ani.w");
  });

  it("uploads a new photo straight to storage, then sets it", async () => {
    const set: unknown[] = [];
    const cors = {
      "Access-Control-Allow-Origin": "http://localhost:3000",
      "Access-Control-Allow-Methods": "POST",
    };
    server.use(
      http.post(api("/users/me/profile-image/upload-url"), () =>
        ok({
          objectKey: "u1/PROFILE_PICTURE/new.png",
          uploadForm: { url: "https://storage.test/bucket", fields: { key: "k" } },
        }),
      ),
      http.options(
        "https://storage.test/bucket",
        () => new HttpResponse(null, { status: 204, headers: cors }),
      ),
      http.post("https://storage.test/bucket", () => new HttpResponse(null, { status: 204, headers: cors })),
      http.put(api("/users/me/profile-image"), async ({ request }) => {
        set.push(await request.json());
        return ok({ ...me, profileImageUrl: "https://media.test/new.png" });
      }),
    );
    renderApp("/settings/profile");

    await screen.findByRole("button", { name: "Add photo" });
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    await user.upload(input, new File(["png"], "me.png", { type: "image/png" }));

    expect(await screen.findByText("Profile photo updated")).toBeInTheDocument();
    expect(set).toEqual([{ objectKey: "u1/PROFILE_PICTURE/new.png" }]);
  });

  it("refuses a picture the backend would not take", async () => {
    renderApp("/settings/profile");

    await screen.findByRole("button", { name: "Add photo" });
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    await user.upload(input, new File([new Uint8Array(3 * 1024 * 1024)], "big.png", { type: "image/png" }));

    expect(screen.getByRole("alert")).toHaveTextContent("The picture can be up to 2 MB.");
  });
});

describe("change email", () => {
  it("sends a code to the new address, then confirms with the password and keeps the new session", async () => {
    const confirmed: unknown[] = [];
    server.use(
      http.post(api("/users/me/email/otp"), () =>
        ok({ otpSendToEmailAddress: "n***@example.com", expirationTimeInMinute: "5" }),
      ),
      http.post(api("/users/me/email"), async ({ request }) => {
        confirmed.push(await request.json());
        return ok({ ...loginResponse(), token: "access-after-email-change" });
      }),
    );
    renderApp("/settings/email");

    expect(await screen.findByText("Your email is ani@example.com.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("New email", { selector: "input" }), "new@example.com");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await user.type(await screen.findByLabelText("Verification code", { selector: "input" }), "123456");
    await user.type(screen.getByLabelText("Current password", { selector: "input" }), "rahasia123");
    await user.click(screen.getByRole("button", { name: "Change email" }));

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(confirmed).toEqual([{ email: "new@example.com", otp: "123456", password: "rahasia123" }]);
    expect(useSession.getState().accessToken).toBe("access-after-email-change");
  });
});

describe("delete account", () => {
  it("deletes with the password and ends the session", async () => {
    const deletions: unknown[] = [];
    server.use(
      http.post(api("/users/me/deletion"), async ({ request }) => {
        deletions.push(await request.json());
        return ok("DELETED");
      }),
    );
    renderApp("/settings/delete-account");

    await user.type(screen.getByLabelText("Current password", { selector: "input" }), "rahasia123");
    await user.click(screen.getByRole("button", { name: "Delete my account" }));

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(deletions).toEqual([{ password: "rahasia123" }]);
    expect(useSession.getState().status).toBe("anonymous");
  });
});

describe("blocked accounts", () => {
  it("unblocks someone", async () => {
    const unblocked: string[] = [];
    server.use(
      http.get(api("/users/me/blocks"), () =>
        ok({ content: [{ id: "u-eko", username: "eko" }], last: true, pageNumber: 0 }),
      ),
      http.delete(api("/users/:userId/block"), ({ params }) => {
        unblocked.push(String(params.userId));
        return ok("DELETED");
      }),
    );
    renderApp("/settings/blocked");

    await user.click(await screen.findByRole("button", { name: "Unblock @eko" }));

    await waitFor(() => {
      expect(unblocked).toEqual(["u-eko"]);
    });
    expect(await screen.findByText("@eko is unblocked")).toBeInTheDocument();
  });
});
