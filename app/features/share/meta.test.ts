import { describe, expect, it } from "vitest";

import { postMeta, profileMeta } from "./meta";

const origin = "https://app.test";
const content = (tags: ReturnType<typeof postMeta>, key: string) =>
  tags.find((tag) => ("property" in tag ? tag.property === key : "name" in tag && tag.name === key)) as
    { content: string } | undefined;

describe("postMeta", () => {
  it("previews the caption with the first image", () => {
    const tags = postMeta(
      {
        id: "p1",
        caption: "A long day   at the beach\nwith friends",
        author: { username: "ani", fullName: "Ani Wijaya", avatarPath: "/public/users/ani/avatar" },
        media: [
          { id: "m1", type: "VIDEO" },
          { id: "m2", type: "IMAGE", imagePath: "/public/media/m2" },
        ],
      },
      origin,
      "/p/p1",
    );

    expect(tags).toContainEqual({
      title: "Ani Wijaya (@ani) on NARRATIV: “A long day at the beach with friends”",
    });
    expect(content(tags, "og:description")?.content).toBe("A long day at the beach with friends");
    expect(content(tags, "og:image")?.content).toBe("https://app.test/api/v1/public/media/m2");
    expect(content(tags, "og:url")?.content).toBe("https://app.test/p/p1");
    expect(content(tags, "twitter:card")?.content).toBe("summary_large_image");
    expect(tags).toContainEqual({ tagName: "link", rel: "canonical", href: "https://app.test/p/p1" });
  });

  it("falls back to the avatar, then to no image", () => {
    const withAvatar = postMeta(
      { author: { username: "ani", avatarPath: "/public/users/ani/avatar" } },
      origin,
      "/p/1",
    );
    expect(content(withAvatar, "og:image")?.content).toBe("https://app.test/api/v1/public/users/ani/avatar");
    expect(content(withAvatar, "og:description")?.content).toBe("A post by @ani on NARRATIV.");

    const bare = postMeta({ author: { username: "ani" } }, origin, "/p/1");
    expect(content(bare, "og:image")).toBeUndefined();
    expect(content(bare, "twitter:card")?.content).toBe("summary");
  });

  it("clips a long caption", () => {
    const description = content(
      postMeta({ caption: "x".repeat(400), author: { username: "a" } }, origin, "/p/1"),
      "og:description",
    );
    expect(description?.content).toHaveLength(200);
    expect(description?.content.endsWith("…")).toBe(true);
  });

  it("stays generic for a post that is not public", () => {
    expect(postMeta(null, origin, "/p/1")).toEqual([{ title: "Post · NARRATIV" }]);
  });
});

describe("profileMeta", () => {
  it("previews the profile", () => {
    const tags = profileMeta(
      { username: "ani", fullName: "Ani Wijaya", followerCount: 12, avatarPath: "/public/users/ani/avatar" },
      origin,
      "/u/ani",
    );

    expect(tags).toContainEqual({ title: "Ani Wijaya (@ani) · NARRATIV" });
    expect(content(tags, "og:type")?.content).toBe("profile");
    expect(content(tags, "og:description")?.content).toContain("12 followers");
  });
});
