import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import { postKeys, type FeedPage, type Post } from "./keys";

type CachedPosts = InfiniteData<FeedPage> | Post | undefined;

function mapPosts(data: CachedPosts, map: (post: Post) => Post | null): CachedPosts {
  if (!data) {
    return data;
  }
  if ("pages" in data) {
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        content: page.content?.flatMap((post) => {
          const mapped = map(post);
          return mapped ? [mapped] : [];
        }),
      })),
    };
  }
  return map(data) ?? undefined;
}

/**
 * Changes one post wherever it is cached (every feed, profile list and its own page), so a like shows at once on
 * every screen. Answers what was cached before, for rolling back.
 */
export function updatePostInCaches(queryClient: QueryClient, postId: string, update: (post: Post) => Post) {
  const before = queryClient.getQueriesData<CachedPosts>({ queryKey: postKeys.all });
  queryClient.setQueriesData<CachedPosts>({ queryKey: postKeys.all }, (data) =>
    mapPosts(data, (post) => (post.id === postId ? update(post) : post)),
  );
  return () => {
    for (const [key, data] of before) {
      queryClient.setQueryData(key, data);
    }
  };
}

/** Drops a deleted post from every cached list and forgets its own page. */
export function removePostFromCaches(queryClient: QueryClient, postId: string) {
  queryClient.removeQueries({ queryKey: postKeys.detail(postId) });
  queryClient.setQueriesData<CachedPosts>({ queryKey: postKeys.all }, (data) =>
    mapPosts(data, (post) => (post.id === postId ? null : post)),
  );
}
