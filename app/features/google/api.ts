import { useQuery } from "@tanstack/react-query";

import { api } from "~/api/client";
import { request } from "~/api/errors";

export const googleKeys = { config: ["google", "config"] as const };

/** This environment's Google OAuth client id, from the backend; enabled is false where none is configured. */
export function useGoogleConfig() {
  return useQuery({
    queryKey: googleKeys.config,
    queryFn: ({ signal }) => request(api.GET("/auth/google-config", { signal })),
    staleTime: Infinity,
    // without it the page simply shows no Google button
    retry: false,
  });
}
