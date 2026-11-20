import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "~/api/errors";

// a refused request (4xx) gives the same answer when repeated; only network and server failures are retried
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && !error.isNetworkError && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetry },
      mutations: { retry: false },
    },
  });
}
