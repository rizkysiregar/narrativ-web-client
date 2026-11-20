import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "~/api/client";
import { request } from "~/api/errors";
import type { Schemas } from "~/api/types";
import { postKeys, updatePostInCaches } from "~/features/posts";

export type Comment = Schemas["CommentResponse"];

export const MAX_COMMENT = 255;

export const commentKeys = {
  all: ["comments"] as const,
  post: (postId: string) => [...commentKeys.all, "post", postId] as const,
  replies: (commentId: string) => [...commentKeys.all, "replies", commentId] as const,
};

const pagePaging = {
  initialPageParam: 0,
  getNextPageParam: (page: { last?: boolean; pageNumber?: number }) =>
    page.last ? undefined : (page.pageNumber ?? 0) + 1,
};

/** The top-level comments of a post, the pinned one first. */
export function useComments(postId: string) {
  return useInfiniteQuery({
    queryKey: commentKeys.post(postId),
    queryFn: ({ pageParam, signal }) =>
      request(
        api.GET("/posts/{postId}/comments", {
          params: { path: { postId }, query: { page: pageParam, size: 20 } },
          signal,
        }),
      ),
    ...pagePaging,
  });
}

/** The replies under a top-level comment, loaded once they are opened. */
export function useReplies(commentId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: commentKeys.replies(commentId),
    queryFn: ({ pageParam, signal }) =>
      request(
        api.GET("/comments/{commentId}/replies", {
          params: { path: { commentId }, query: { page: pageParam, size: 10 } },
          signal,
        }),
      ),
    enabled,
    ...pagePaging,
  });
}

/**
 * Comments on a post, or replies when `parentId` is set: replies are one level deep, the backend files a reply to a
 * reply under the same top-level comment.
 */
export function useAddComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { content: string; parentId?: string }) =>
      request(api.POST("/posts/{postId}/comments", { params: { path: { postId } }, body })),
    onSuccess: async () => {
      updatePostInCaches(queryClient, postId, (post) => ({
        ...post,
        commentCount: (post.commentCount ?? 0) + 1,
      }));
      await queryClient.invalidateQueries({ queryKey: commentKeys.all });
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      request(api.DELETE("/comments/{commentId}", { params: { path: { commentId } } })),
    // a deleted comment takes its replies along, so the new count comes from the backend
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: commentKeys.all }),
        queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) }),
      ]);
    },
  });
}

/** For the post's author: pins a top-level comment on top, or unpins it (`commentId` null). */
export function usePinComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string | null) =>
      commentId
        ? request(
            api.PUT("/posts/{postId}/pinned-comment", { params: { path: { postId } }, body: { commentId } }),
          )
        : request(api.DELETE("/posts/{postId}/pinned-comment", { params: { path: { postId } } })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: commentKeys.post(postId) });
    },
  });
}
