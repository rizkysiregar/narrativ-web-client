import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { api } from "~/api/client";
import { request } from "~/api/errors";
import type { Schemas } from "~/api/types";

export type Post = Schemas["PostFeedResponse"];
export type PostMedia = Schemas["PostMediaResponse"];
type FeedPage = Schemas["PaginatedResponsePostFeedResponse"];

const PAGE_SIZE = 10;

export const postKeys = {
  all: ["posts"] as const,
  feed: (feed: "home" | "explore") => [...postKeys.all, "feed", feed] as const,
  byUser: (username: string, mediaOnly: boolean) =>
    [...postKeys.all, "user", username.toLowerCase(), { mediaOnly }] as const,
  detail: (postId: string) => [...postKeys.all, "detail", postId] as const,
};

// the feeds page with a cursor: every page answers the one after it, the last page answers none
const cursorPaging = {
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (page: FeedPage) => (page.last ? undefined : page.nextCursor),
};

/** Own posts and those of followed people, newest first, then suggestions (`suggested: true`). */
export function useHomeFeed() {
  return useInfiniteQuery({
    queryKey: postKeys.feed("home"),
    queryFn: ({ pageParam, signal }) =>
      request(api.GET("/posts", { params: { query: { size: PAGE_SIZE, cursor: pageParam } }, signal })),
    ...cursorPaging,
  });
}

/** Every post the user may see, recent ones ranked by the backend. */
export function useExploreFeed() {
  return useInfiniteQuery({
    queryKey: postKeys.feed("explore"),
    queryFn: ({ pageParam, signal }) =>
      request(
        api.GET("/posts/explore", { params: { query: { size: PAGE_SIZE, cursor: pageParam } }, signal }),
      ),
    ...cursorPaging,
  });
}

/** The posts of one user; `mediaOnly` leaves out caption-only posts (the media grid). */
export function useUserPosts(username: string, mediaOnly = false) {
  return useInfiniteQuery({
    queryKey: postKeys.byUser(username, mediaOnly),
    queryFn: ({ pageParam, signal }) =>
      request(
        api.GET("/posts/users/{username}/posts", {
          params: {
            path: { username },
            query: { size: mediaOnly ? 18 : PAGE_SIZE, mediaOnly, cursor: pageParam },
          },
          signal,
        }),
      ),
    ...cursorPaging,
  });
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: postKeys.detail(postId),
    queryFn: ({ signal }) => request(api.GET("/posts/{postId}", { params: { path: { postId } }, signal })),
  });
}
