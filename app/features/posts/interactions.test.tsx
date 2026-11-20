import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
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
  // loginResponse's userId is "u1"
  startSession(loginResponse());
});

const storageCors = {
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Methods": "POST",
};

function homeShows(...posts: ReturnType<typeof post>[]) {
  server.use(http.get(api("/posts"), () => ok(feedPage(posts))));
}

describe("like", () => {
  it("shows the like at once and keeps it when the backend agrees", async () => {
    homeShows(post({ id: "p1", likeCount: 3, liked: false }));
    let liked = 0;
    server.use(
      http.post(api("/posts/p1/like"), () => {
        liked += 1;
        return ok("CREATED");
      }),
    );
    renderApp("/");

    const button = await screen.findByRole("button", { name: "Like" });
    await user.click(button);

    expect(screen.getByRole("button", { name: "Unlike" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("4 likes")).toBeInTheDocument();
    await waitFor(() => {
      expect(liked).toBe(1);
    });
  });

  it("goes back when the backend refuses", async () => {
    homeShows(post({ id: "p1", likeCount: 3, liked: true }));
    server.use(http.delete(api("/posts/p1/dislike"), () => fail(400, "Could not unlike", "BAD_REQUEST")));
    renderApp("/");

    await user.click(await screen.findByRole("button", { name: "Unlike" }));

    expect(await screen.findByText("Could not unlike")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlike" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("3 likes")).toBeInTheDocument();
  });
});

describe("delete", () => {
  it("lets the author delete a post after asking", async () => {
    homeShows(
      post({ id: "mine", userId: "u1", caption: "My own story" }),
      post({ id: "theirs", userId: "u9", caption: "Someone else" }),
    );
    let deleted = "";
    server.use(
      http.delete(api("/posts/:postId"), ({ params }) => {
        deleted = String(params.postId);
        return ok("DELETED");
      }),
    );
    renderApp("/");

    const mine = (await screen.findByText("My own story")).closest("article") as HTMLElement;
    const theirs = screen.getByText("Someone else").closest("article") as HTMLElement;
    expect(within(theirs).queryByRole("button", { name: "Delete post" })).not.toBeInTheDocument();

    await user.click(within(mine).getByRole("button", { name: "Delete post" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete this post?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.queryByText("My own story")).not.toBeInTheDocument();
    });
    expect(deleted).toBe("mine");
    expect(screen.getByText("Someone else")).toBeInTheDocument();
  });
});

describe("composer", () => {
  it("uploads the media straight to storage, then creates the post", async () => {
    // field names of each multipart upload, in order (read as text: jsdom's File is not one Node's parser takes)
    const uploads: string[][] = [];
    const created: unknown[] = [];
    server.use(
      http.post(api("/posts/upload-url"), async ({ request }) => {
        const { contentType } = (await request.json()) as { contentType: string };
        return ok({
          objectKey: `u1/POST_FEED/${String(uploads.length + created.length)}-${contentType.replace("/", ".")}`,
          uploadForm: { url: "https://storage.test/bucket", fields: { key: "k", policy: "signed" } },
        });
      }),
      // upload progress listeners make the browser ask first (CORS preflight), as MinIO answers it
      http.options(
        "https://storage.test/bucket",
        () => new HttpResponse(null, { status: 204, headers: storageCors }),
      ),
      http.post("https://storage.test/bucket", async ({ request }) => {
        const body = await request.text();
        uploads.push([...body.matchAll(/form-data; name="([^"]+)"/g)].map((match) => match[1] ?? ""));
        return new HttpResponse(null, { status: 204, headers: storageCors });
      }),
      http.post(api("/posts"), async ({ request }) => {
        created.push(await request.json());
        return ok({ status: "CREATED" });
      }),
    );
    renderApp("/");

    await user.click((await screen.findAllByRole("button", { name: "Create post" }))[0] as HTMLElement);
    const dialog = await screen.findByRole("dialog", { name: "New post" });
    await user.type(within(dialog).getByRole("textbox", { name: "Caption" }), "Sunset at the beach");
    const photo = new File(["photo-bytes"], "sunset.jpg", { type: "image/jpeg" });
    await user.upload(dialog.querySelector("input[type=file]") as HTMLInputElement, photo);
    expect(within(dialog).getByRole("list", { name: "Selected media" }).children).toHaveLength(1);
    await user.click(within(dialog).getByRole("button", { name: "Post" }));

    expect(await screen.findByText("Your post is live")).toBeInTheDocument();
    expect(created).toEqual([{ caption: "Sunset at the beach", mediaKeys: ["u1/POST_FEED/0-image.jpeg"] }]);
    expect(uploads).toHaveLength(1);
    // the signed fields first, the file last (S3-style POST ignores fields after it)
    expect(uploads[0]).toEqual(["key", "policy", "file"]);
  });

  it("refuses files the backend would not take, before uploading anything", async () => {
    renderApp("/");

    await user.click((await screen.findAllByRole("button", { name: "Create post" }))[0] as HTMLElement);
    const dialog = await screen.findByRole("dialog", { name: "New post" });
    const huge = new File([new Uint8Array(6 * 1024 * 1024)], "huge.png", { type: "image/png" });
    await user.upload(dialog.querySelector("input[type=file]") as HTMLInputElement, huge);

    expect(within(dialog).getByRole("alert")).toHaveTextContent("Photos can be up to 5 MB.");
    expect(within(dialog).queryByRole("list", { name: "Selected media" })).not.toBeInTheDocument();
    // nothing to post yet
    expect(within(dialog).getByRole("button", { name: "Post" })).toBeDisabled();
  });

  it("posts a caption on its own", async () => {
    const created: unknown[] = [];
    server.use(
      http.post(api("/posts"), async ({ request }) => {
        created.push(await request.json());
        return ok({ status: "CREATED" });
      }),
    );
    renderApp("/");

    await user.click((await screen.findAllByRole("button", { name: "Create post" }))[0] as HTMLElement);
    const dialog = await screen.findByRole("dialog", { name: "New post" });
    await user.type(within(dialog).getByRole("textbox", { name: "Caption" }), "  Just words  ");
    await user.click(within(dialog).getByRole("button", { name: "Post" }));

    expect(await screen.findByText("Your post is live")).toBeInTheDocument();
    expect(created).toEqual([{ caption: "Just words", mediaKeys: [] }]);
  });
});
