import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { api } from "~/api/client";
import { request } from "~/api/errors";
import type { Schemas } from "~/api/types";
import { postKeys } from "~/features/posts";
import { errorMessage } from "~/shared/lib/error-message";

export type PublicUser = Schemas["PublicUserDTO"];
export type FollowUser = Schemas["FollowUserResponse"];

const PAGE_SIZE = 20;

export const userKeys = {
  all: ["users"] as const,
  byUsername: (username: string) => [...userKeys.all, "by-username", username.toLowerCase()] as const,
  followStatus: (userId: string) => [...userKeys.all, userId, "follow-status"] as const,
  follows: (userId: string, kind: FollowKind) => [...userKeys.all, userId, kind] as const,
  search: (term: string) => [...userKeys.all, "search", term.toLowerCase()] as const,
};

export type FollowKind = "followers" | "following";

// these lists page by number: the next page is the one after the last, until the backend says it was the last
const pagePaging = {
  initialPageParam: 0,
  getNextPageParam: (page: { last?: boolean; pageNumber?: number }) =>
    page.last ? undefined : (page.pageNumber ?? 0) + 1,
};

export function useUserByUsername(username: string) {
  return useQuery({
    queryKey: userKeys.byUsername(username),
    queryFn: ({ signal }) =>
      request(api.GET("/users/by-username/{username}", { params: { path: { username } }, signal })),
  });
}

/** Follower and following counts of a user, and whether the signed-in user follows them. */
export function useFollowStatus(userId: string | undefined) {
  return useQuery({
    queryKey: userKeys.followStatus(userId ?? ""),
    queryFn: ({ signal }) =>
      request(
        api.GET("/users/{userId}/follow-status", { params: { path: { userId: userId ?? "" } }, signal }),
      ),
    enabled: userId !== undefined,
  });
}

export function useFollows(userId: string | undefined, kind: FollowKind) {
  return useInfiniteQuery({
    queryKey: userKeys.follows(userId ?? "", kind),
    queryFn: ({ pageParam, signal }) =>
      request(
        api.GET(kind === "followers" ? "/users/{userId}/followers" : "/users/{userId}/following", {
          params: { path: { userId: userId ?? "" }, query: { page: pageParam, size: PAGE_SIZE } },
          signal,
        }),
      ),
    enabled: userId !== undefined,
    ...pagePaging,
  });
}

/** Active users whose username contains `term` (people the user blocked, or who blocked them, never show up). */
export function useUserSearch(term: string) {
  return useInfiniteQuery({
    queryKey: userKeys.search(term),
    queryFn: ({ pageParam, signal }) =>
      request(
        api.GET("/users", {
          params: { query: { username: term, page: pageParam, size: PAGE_SIZE } },
          signal,
        }),
      ),
    enabled: term.length > 0,
    ...pagePaging,
  });
}

type FollowStatus = Schemas["FollowStatusResponse"];

/**
 * Follows or unfollows a user. The button and the follower count change at once and go back if the backend refuses;
 * afterwards the lists and the home feed (which shows followed people) are fetched again.
 */
export function useFollow(userId: string) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const key = userKeys.followStatus(userId);

  return useMutation({
    mutationFn: (follow: boolean) =>
      follow
        ? request(api.POST("/users/{userId}/follow", { params: { path: { userId } } }))
        : request(api.DELETE("/users/{userId}/follow", { params: { path: { userId } } })),
    onMutate: async (follow) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<FollowStatus>(key);
      queryClient.setQueryData<FollowStatus>(key, (status) => ({
        ...status,
        isFollowing: follow,
        followerCount: Math.max(0, (status?.followerCount ?? 0) + (follow ? 1 : -1)),
      }));
      return { before };
    },
    onError: (error, _follow, context) => {
      queryClient.setQueryData(key, context?.before);
      toast.error(errorMessage(error, t));
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...userKeys.all, userId] }),
        queryClient.invalidateQueries({ queryKey: postKeys.feed("home") }),
      ]);
    },
  });
}
