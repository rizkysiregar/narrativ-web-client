import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { api } from "~/api/client";
import { request } from "~/api/errors";
import { errorMessage } from "~/shared/lib/error-message";

import { removePostFromCaches, updatePostInCaches } from "./cache";
import { postKeys, type FeedPage } from "./keys";

export { postKeys, type Post, type PostMedia } from "./keys";

const PAGE_SIZE = 10;
/** The backend refuses shorter search terms (400). */
export const SEARCH_MIN_LENGTH = 2;

// the feeds page with a cursor: every page answers the one after it, the last page answers none
const cursorPaging = {
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (page: FeedPage) => (page.last ? undefined : page.nextCursor),
};

/** Own posts and those of followed people, newest first, with suggestions (`suggested: true`) mixed in. */
export function useHomeFeed() {
  return useInfiniteQuery({
    queryKey: postKeys.feed("home"),
    queryFn: ({ pageParam, signal }) =>
      request(api.GET("/posts", { params: { query: { size: PAGE_SIZE, cursor: pageParam } }, signal })),
    ...cursorPaging,
  });
}

/** Posts whose caption holds every word of `term` (each also as the start of a word), newest first. */
export function usePostSearch(term: string) {
  return useInfiniteQuery({
    queryKey: postKeys.search(term),
    queryFn: ({ pageParam, signal }) =>
      request(
        api.GET("/posts/search", {
          params: { query: { q: term, size: PAGE_SIZE, cursor: pageParam } },
          signal,
        }),
      ),
    enabled: term.length >= SEARCH_MIN_LENGTH,
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

/**
 * Likes or unlikes a post. Every cached copy changes at once and goes back if the backend refuses; the counts are
 * not fetched again afterwards, so nothing jumps.
 */
export function useLikePost() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      liked
        ? request(api.POST("/posts/{postId}/like", { params: { path: { postId } } }))
        : request(api.DELETE("/posts/{postId}/dislike", { params: { path: { postId } } })),
    onMutate: async ({ postId, liked }) => {
      await queryClient.cancelQueries({ queryKey: postKeys.all });
      const rollback = updatePostInCaches(queryClient, postId, (post) => ({
        ...post,
        liked,
        likeCount: Math.max(0, (post.likeCount ?? 0) + (liked ? 1 : -1)),
      }));
      return { rollback };
    },
    onError: (error, _variables, context) => {
      context?.rollback();
      toast.error(errorMessage(error, t));
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => request(api.DELETE("/posts/{postId}", { params: { path: { postId } } })),
    onSuccess: (_result, postId) => {
      removePostFromCaches(queryClient, postId);
    },
  });
}

/** Creates a post from a caption and the object keys of its uploaded media, then refreshes every feed. */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { caption?: string; mediaKeys: string[] }) => request(api.POST("/posts", { body })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}
