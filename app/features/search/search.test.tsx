import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { startSession } from "~/api/session";
import { changeLanguage } from "~/shared/i18n";
import { loginResponse, ok } from "~/test/backend";
import { feedPage, numberedPage, post } from "~/test/fixtures";
import { renderApp } from "~/test/render-app";
import { api, server } from "~/test/server";

const user = userEvent.setup();

const person = (username: string, firstName: string, lastName: string) => ({
  id: `u-${username}`,
  username,
  firstName,
  lastName,
  fullName: `${firstName} ${lastName}`,
});

/** The backend's two searches; answers what each test gives and records the terms asked for. */
function searchBackend({
  people = [],
  posts = [],
}: {
  people?: ReturnType<typeof person>[];
  posts?: ReturnType<typeof post>[];
}) {
  const asked = { people: [] as (string | null)[], posts: [] as (string | null)[] };
  server.use(
    http.get(api("/users/search"), ({ request }) => {
      asked.people.push(new URL(request.url).searchParams.get("q"));
      return ok(numberedPage(people));
    }),
    http.get(api("/posts/search"), ({ request }) => {
      asked.posts.push(new URL(request.url).searchParams.get("q"));
      return ok(feedPage(posts));
    }),
  );
  return asked;
}

beforeEach(async () => {
  await changeLanguage("en");
  startSession(loginResponse());
});

describe("search on home", () => {
  it("finds people and posts for a word, with one request each, and keeps the term in the URL", async () => {
    const asked = searchBackend({
      people: [person("coffeelover", "Kopi", "Enthusiast")],
      posts: [post({ caption: "ngopi pagi di kedai #coffee" })],
    });
    renderApp("/");

    await user.type(screen.getByRole("searchbox", { name: "Search people and posts" }), "coffee");

    const people = await screen.findByRole("list", { name: "People found" });
    expect(within(people).getByRole("link", { name: /Kopi Enthusiast/ })).toHaveAttribute(
      "href",
      "/u/coffeelover",
    );
    expect(await screen.findByText("ngopi pagi di kedai #coffee")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Top" })).toHaveAttribute("aria-selected", "true");
    // debounced: one request per search for the whole word, not one per letter
    expect(asked).toEqual({ people: ["coffee"], posts: ["coffee"] });
  });

  it("shows only the best people on top and all of them on the people tab, without asking again", async () => {
    const asked = searchBackend({
      people: ["rizky1", "rizky2", "rizky3", "rizky4"].map((name) => person(name, "Rizky", name)),
    });
    renderApp("/?q=rizky");

    const top = await screen.findByRole("list", { name: "People found" });
    expect(within(top).getAllByRole("link")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "See all people" }));

    expect(screen.getByRole("tab", { name: "People" })).toHaveAttribute("aria-selected", "true");
    expect(within(screen.getByRole("list", { name: "People found" })).getAllByRole("link")).toHaveLength(4);
    expect(asked.people).toEqual(["rizky"]);
  });

  it("lists the matching posts on the posts tab", async () => {
    searchBackend({ posts: [post({ caption: "Coffee & code" })] });
    renderApp("/?q=coffee&tab=posts");

    expect(await screen.findByText("Coffee & code")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "People found" })).not.toBeInTheDocument();
  });

  it("says when nothing matches", async () => {
    searchBackend({});
    renderApp("/?q=zzz");

    expect(await screen.findByText("Nothing matches “zzz”")).toBeInTheDocument();
  });

  it("asks for a second character before searching", async () => {
    const asked = searchBackend({});
    renderApp("/?q=k");

    expect(await screen.findByText("Find people and posts")).toBeInTheDocument();
    expect(asked).toEqual({ people: [], posts: [] });
  });

  it("brings the feed back when the search is cleared", async () => {
    searchBackend({});
    server.use(http.get(api("/posts"), () => ok(feedPage([post({ caption: "From the feed" })]))));
    renderApp("/?q=zzz");

    await screen.findByText("Nothing matches “zzz”");
    await user.click(screen.getByRole("button", { name: "Clear search" }));

    expect(await screen.findByText("From the feed")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search people and posts" })).toHaveValue("");
  });

  it("sends an old /search link to home with its term", async () => {
    const asked = searchBackend({ people: [person("budi", "Budi", "Santoso")] });
    renderApp("/search?q=budi");

    expect(await screen.findByRole("link", { name: /Budi Santoso/ })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search people and posts" })).toHaveValue("budi");
    expect(asked.people).toEqual(["budi"]);
  });
});
