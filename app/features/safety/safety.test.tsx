import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { startSession } from "~/api/session";
import { changeLanguage } from "~/shared/i18n";
import { fail, loginResponse, ok } from "~/test/backend";
import { feedPage, post } from "~/test/fixtures";
import { renderApp } from "~/test/render-app";
import { api, server } from "~/test/server";

const user = userEvent.setup();

beforeEach(async () => {
  await changeLanguage("en");
  startSession(loginResponse()); // userId "u1"
});

describe("report", () => {
  it("reports someone else's post; Other needs a description", async () => {
    server.use(
      http.get(api("/posts"), () =>
        ok(feedPage([post({ id: "p9", userId: "u9", username: "eko", caption: "Spammy" })])),
      ),
    );
    const reports: unknown[] = [];
    server.use(
      http.post(api("/reports"), async ({ request }) => {
        reports.push(await request.json());
        return ok("CREATED");
      }),
    );
    renderApp("/");

    const card = (await screen.findByText("Spammy")).closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "More options" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Options" })).getByRole("button", {
        name: "Report post",
      }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Report post" });
    await user.click(within(dialog).getByRole("radio", { name: "Something else" }));
    expect(within(dialog).getByRole("button", { name: "Send report" })).toBeDisabled();
    await user.type(within(dialog).getByRole("textbox", { name: "Tell us more" }), "Selling stuff");
    await user.click(within(dialog).getByRole("button", { name: "Send report" }));

    expect(await screen.findByText("Thanks, our moderators will take a look.")).toBeInTheDocument();
    expect(reports).toEqual([
      { targetType: "POST", targetId: "p9", reason: "OTHER", description: "Selling stuff" },
    ]);
  });

  it("shows the backend's answer to a second report", async () => {
    server.use(
      http.get(api("/posts"), () =>
        ok(feedPage([post({ id: "p9", userId: "u9", username: "eko", caption: "Again" })])),
      ),
      http.post(api("/reports"), () => fail(409, "You already reported this.", "REPORT_ALREADY_EXISTS")),
    );
    renderApp("/");

    const card = (await screen.findByText("Again")).closest("article") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "More options" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Options" })).getByRole("button", {
        name: "Report post",
      }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Report post" });
    await user.click(within(dialog).getByRole("radio", { name: "Spam" }));
    await user.click(within(dialog).getByRole("button", { name: "Send report" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("You already reported this.");
  });

  it("offers no report on the user's own post", async () => {
    server.use(http.get(api("/posts"), () => ok(feedPage([post({ userId: "u1", caption: "Mine" })]))));
    renderApp("/");

    const card = (await screen.findByText("Mine")).closest("article") as HTMLElement;
    expect(within(card).queryByRole("button", { name: "More options" })).not.toBeInTheDocument();
  });
});

describe("block", () => {
  it("blocks from the profile and leaves it", async () => {
    server.use(
      http.get(api("/users/by-username/eko"), () => ok({ id: "u-eko", username: "eko" })),
      http.get(api("/users/u-eko/follow-status"), () =>
        ok({ followerCount: 1, followingCount: 1, isFollowing: false }),
      ),
      http.get(api("/posts/users/eko/posts"), () => ok(feedPage([]))),
    );
    const blocked: string[] = [];
    server.use(
      http.post(api("/users/:userId/block"), ({ params }) => {
        blocked.push(String(params.userId));
        return ok("CREATED");
      }),
    );
    renderApp("/u/eko");

    await user.click(await screen.findByRole("button", { name: "More options" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Options" })).getByRole("button", {
        name: "Block @eko",
      }),
    );
    await user.click(
      within(await screen.findByRole("dialog", { name: "Block @eko?" })).getByRole("button", {
        name: "Block",
      }),
    );

    expect(await screen.findByRole("heading", { name: "Home" })).toBeInTheDocument();
    await waitFor(() => {
      expect(blocked).toEqual(["u-eko"]);
    });
  });
});
