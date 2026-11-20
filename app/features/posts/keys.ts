import type { Schemas } from "~/api/types";

export type Post = Schemas["PostFeedResponse"];
export type PostMedia = Schemas["PostMediaResponse"];
export type FeedPage = Schemas["PaginatedResponsePostFeedResponse"];

export const postKeys = {
  all: ["posts"] as const,
  feed: (feed: "home" | "explore") => [...postKeys.all, "feed", feed] as const,
  byUser: (username: string, mediaOnly: boolean) =>
    [...postKeys.all, "user", username.toLowerCase(), { mediaOnly }] as const,
  detail: (postId: string) => [...postKeys.all, "detail", postId] as const,
};
