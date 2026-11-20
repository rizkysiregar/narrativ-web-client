import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { startSession } from "~/api/session";
import { changeLanguage } from "~/shared/i18n";
import { loginResponse, ok } from "~/test/backend";
import { feedPage, post } from "~/test/fixtures";
import { renderApp } from "~/test/render-app";
import { api, server } from "~/test/server";

const user = userEvent.setup();

beforeEach(async () => {
  await changeLanguage("en");
  startSession(loginResponse());
  server.use(http.get(api("/posts"), () => ok(feedPage([post({ id: "p7", caption: "Share me" })]))));
});

describe("share button", () => {
  it("copies the post's link where there is no share sheet", async () => {
    renderApp("/");

    await user.click(await screen.findByRole("button", { name: "Share post" }));

    expect(await navigator.clipboard.readText()).toBe(`${location.origin}/p/p7`);
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
  });

  it("opens the system share sheet where there is one", async () => {
    const share = vi.fn(() => Promise.resolve());
    // jsdom has no Web Share API
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    try {
      renderApp("/");

      await user.click(await screen.findByRole("button", { name: "Share post" }));

      expect(share).toHaveBeenCalledWith({
        title: "A post by @ani on NARRATIV",
        url: `${location.origin}/p/p7`,
      });
    } finally {
      Reflect.deleteProperty(navigator, "share");
    }
  });
});
