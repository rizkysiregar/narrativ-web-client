import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import NotFound from "~/routes/not-found";
import { changeLanguage } from "~/shared/i18n";
import { createQueryClient } from "~/shared/lib/query-client";

import { AppShell } from "./app-shell";

function renderAt(path: string) {
  const Stub = createRoutesStub([
    {
      Component: () => (
        <AppShell>
          <p>page</p>
        </AppShell>
      ),
      children: [
        { path: "/", Component: () => null },
        { path: "/notifications", Component: () => null },
      ],
    },
    { path: "*", Component: NotFound },
  ]);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Stub initialEntries={[path]} />
    </QueryClientProvider>,
  );
}

describe("AppShell", () => {
  beforeEach(async () => {
    await changeLanguage("en");
  });

  it("shows the navigation and marks the current page", () => {
    renderAt("/notifications");

    const [sidebar] = screen.getAllByRole("navigation", { name: "Main navigation" });
    expect(sidebar).toBeDefined();
    expect(screen.getAllByRole("link", { name: "Notifications" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "Home" })[0]).not.toHaveAttribute("aria-current");
  });

  it("switches the language", async () => {
    renderAt("/");

    // the sidebar and the phone top bar each have one
    const [select] = screen.getAllByLabelText("Language");
    expect(select).toBeInstanceOf(HTMLSelectElement);
    await userEvent.selectOptions(select as HTMLSelectElement, "id");

    expect(screen.getAllByRole("link", { name: "Beranda" }).length).toBeGreaterThan(0);
    expect(document.documentElement.lang).toBe("id");
  });

  it("offers a way home from an unknown page", () => {
    renderAt("/does-not-exist");

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });
});
