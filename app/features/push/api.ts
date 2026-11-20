import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { api } from "~/api/client";
import { request } from "~/api/errors";
import { notificationKeys } from "~/features/notifications";

import { onForegroundPush, pushState, syncPush } from "./push";

export const pushKeys = { config: ["push", "config"] as const };

/** This environment's Firebase web app, from the backend; enabled is false until it is configured there. */
export function useWebPushConfig(enabled = true) {
  return useQuery({
    queryKey: pushKeys.config,
    queryFn: ({ signal }) => request(api.GET("/devices/web-push-config", { signal })),
    staleTime: Infinity,
    enabled,
  });
}

/**
 * For the signed-in app: keeps the push token registered where push is on, and turns pushes that arrive while the
 * app is in front into a toast plus a fresh inbox and badge.
 */
export function usePushSetup(signedIn: boolean) {
  const queryClient = useQueryClient();
  const config = useWebPushConfig(signedIn && pushState() === "on");

  useEffect(() => {
    if (!config.data?.enabled) {
      return;
    }
    void syncPush(config.data).catch(() => undefined);
    return onForegroundPush(config.data, (title, body) => {
      toast(title, { description: body });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    });
  }, [config.data, queryClient]);
}
