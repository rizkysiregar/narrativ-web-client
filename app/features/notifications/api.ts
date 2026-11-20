import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import { api } from "~/api/client";
import { request } from "~/api/errors";
import type { Schemas } from "~/api/types";

export type Notification = Schemas["NotificationResponse"];
type InboxPage = Schemas["PaginatedResponseNotificationResponse"];

export const notificationKeys = {
  all: ["notifications"] as const,
  inbox: ["notifications", "inbox"] as const,
  unread: ["notifications", "unread"] as const,
};

/** The inbox, newest first; likes of one post on one day arrive as one entry with several actors. */
export function useInbox() {
  return useInfiniteQuery({
    queryKey: notificationKeys.inbox,
    queryFn: ({ pageParam, signal }) =>
      request(
        api.GET("/users/me/notifications", { params: { query: { cursor: pageParam, size: 20 } }, signal }),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => (page.last ? undefined : page.nextCursor),
  });
}

/** The badge on the navigation. Polled while the app is open, there is no push to the web yet (phase 7). */
export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: async ({ signal }) =>
      (await request(api.GET("/users/me/notifications/unread-count", { signal }))).unread ?? 0,
    refetchInterval: 60_000,
    enabled,
  });
}

function markInboxRead(queryClient: ReturnType<typeof useQueryClient>, groupKey?: string) {
  queryClient.setQueryData<InfiniteData<InboxPage>>(notificationKeys.inbox, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            content: page.content?.map((entry) =>
              groupKey === undefined || entry.groupKey === groupKey ? { ...entry, unread: false } : entry,
            ),
          })),
        }
      : data,
  );
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupKey: string) =>
      request(api.POST("/users/me/notifications/read", { body: { groupKey } })),
    onMutate: (groupKey) => {
      markInboxRead(queryClient, groupKey);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.unread }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => request(api.POST("/users/me/notifications/read-all")),
    onMutate: () => {
      markInboxRead(queryClient);
      queryClient.setQueryData(notificationKeys.unread, 0);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
