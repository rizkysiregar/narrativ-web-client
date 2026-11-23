import type { Schemas } from "~/api/types";

export type Post = Schemas["PostFeedResponse"];
export type PostMedia = Schemas["PostMediaResponse"];
export type FeedPage = Schemas["PaginatedResponsePostFeedResponse"];

export const postKeys = {
  all: ["posts"] as const,
  feed: (feed: "home") => [...postKeys.all, "feed", feed] as const,
  // under postKeys.all, so a like or a delete also shows in the search results
  search: (term: string) => [...postKeys.all, "search", term.toLowerCase()] as const,
  byUser: (username: string, mediaOnly: boolean) =>
    [...postKeys.all, "user", username.toLowerCase(), { mediaOnly }] as const,
  detail: (postId: string) => [...postKeys.all, "detail", postId] as const,
};
