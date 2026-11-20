import type { MetaDescriptor } from "react-router";

import type { Schemas } from "~/api/types";
import { API_BASE_PATH, APP_NAME } from "~/shared/config/env";

type PublicPost = Schemas["PublicPostResponse"];
type PublicProfile = Schemas["PublicProfileResponse"];

const DESCRIPTION_LENGTH = 200;

function clip(text: string, length: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length - 1).trimEnd()}…` : flat;
}

/** An absolute URL of an image path of the public API (they are relative to the API base). */
function imageUrl(origin: string, path: string | undefined): string | undefined {
  return path ? `${origin}${API_BASE_PATH}${path}` : undefined;
}

function tags(props: {
  title: string;
  description: string;
  url: string;
  type: "article" | "profile";
  image: string | undefined;
}): MetaDescriptor[] {
  const { title, description, url, type, image } = props;
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:site_name", content: APP_NAME },
    { property: "og:type", content: type },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    ...(image
      ? [
          { property: "og:image", content: image },
          { name: "twitter:image", content: image },
        ]
      : []),
  ];
}

/** Link preview tags of a shared post; generic ones when the post is not public. */
export function postMeta(post: PublicPost | null, origin: string, path: string): MetaDescriptor[] {
  if (!post) {
    return [{ title: `Post · ${APP_NAME}` }];
  }
  const username = post.author?.username ?? "";
  const author = post.author?.fullName?.trim()
    ? `${post.author.fullName.trim()} (@${username})`
    : `@${username}`;
  const caption = post.caption?.trim() ? clip(post.caption, DESCRIPTION_LENGTH) : undefined;
  const firstImage = post.media?.find((media) => media.imagePath)?.imagePath;
  return tags({
    title: caption
      ? `${author} on ${APP_NAME}: “${clip(post.caption ?? "", 60)}”`
      : `${author} on ${APP_NAME}`,
    description: caption ?? `A post by ${author} on ${APP_NAME}.`,
    url: `${origin}${path}`,
    type: "article",
    image: imageUrl(origin, firstImage ?? post.author?.avatarPath),
  });
}

/** Link preview tags of a shared profile; generic ones when the profile is not public. */
export function profileMeta(profile: PublicProfile | null, origin: string, path: string): MetaDescriptor[] {
  if (!profile) {
    return [{ title: APP_NAME }];
  }
  const username = profile.username ?? "";
  const name = profile.fullName?.trim();
  return tags({
    title: name ? `${name} (@${username}) · ${APP_NAME}` : `@${username} · ${APP_NAME}`,
    description: `${String(profile.followerCount ?? 0)} followers · Follow @${username} on ${APP_NAME} to see their stories.`,
    url: `${origin}${path}`,
    type: "profile",
    image: imageUrl(origin, profile.avatarPath),
  });
}
