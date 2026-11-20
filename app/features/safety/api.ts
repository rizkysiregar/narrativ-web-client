import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "~/api/client";
import { request } from "~/api/errors";
import type { Schemas } from "~/api/types";

export type ReportBody = Schemas["CreateReportRequest"];
export type ReportReason = ReportBody["reason"];
export interface ReportTarget {
  type: ReportBody["targetType"];
  id: string;
}

export const REPORT_REASONS: readonly ReportReason[] = [
  "SPAM",
  "HARASSMENT",
  "HATE_SPEECH",
  "SEXUAL_CONTENT",
  "VIOLENCE",
  "MISINFORMATION",
  "OTHER",
];
export const MAX_REPORT_DESCRIPTION = 500;

export const blockKeys = { list: ["blocks"] as const };

export function useBlockedUsers() {
  return useInfiniteQuery({
    queryKey: blockKeys.list,
    queryFn: ({ pageParam, signal }) =>
      request(api.GET("/users/me/blocks", { params: { query: { page: pageParam, size: 20 } }, signal })),
    initialPageParam: 0,
    getNextPageParam: (page) => (page.last ? undefined : (page.pageNumber ?? 0) + 1),
  });
}

/**
 * Blocks or unblocks a user. A block hides them everywhere (feeds, comments, search, their profile) and both ways,
 * so every cached answer is fetched again.
 */
export function useBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, block }: { userId: string; block: boolean }) =>
      block
        ? request(api.POST("/users/{userId}/block", { params: { path: { userId } } }))
        : request(api.DELETE("/users/{userId}/block", { params: { path: { userId } } })),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
  });
}

export function useReport() {
  return useMutation({
    mutationFn: (body: ReportBody) => request(api.POST("/reports", { body })),
  });
}
