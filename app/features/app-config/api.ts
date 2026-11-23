import { useQuery } from "@tanstack/react-query";

import { api } from "~/api/client";
import { request } from "~/api/errors";
import { readPreference, writePreference } from "~/shared/lib/storage";

export const appConfigKeys = { client: ["app-config", "client"] as const };

const CHAT_KEY = "narrativ:feature:chat";

export interface ClientFeatures {
  chat: boolean;
}

function lastKnown(): ClientFeatures | undefined {
  const chat = readPreference(CHAT_KEY);
  return chat === null ? undefined : { chat: chat === "true" };
}

/**
 * The feature switches an admin flips in App management (GET /config/client). Asked again when the tab comes back
 * into focus, so a switch reaches open tabs within minutes. The last answer is kept in the browser: a reload or a
 * failed request uses it instead of flashing the feature in or out.
 */
export function useClientFeatures() {
  return useQuery({
    queryKey: appConfigKeys.client,
    queryFn: async ({ signal }): Promise<ClientFeatures> => {
      const body = await request(api.GET("/config/client", { signal }));
      const features = { chat: body.features?.chat === true };
      writePreference(CHAT_KEY, String(features.chat));
      return features;
    },
    initialData: lastKnown,
    // the stored value is only a placeholder until the backend answers
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Whether chat is switched on: undefined until the first answer when nothing is stored yet. Hide chat while it is not
 * true; send a user away from a chat page only once it is false.
 */
export function useChatEnabled(): boolean | undefined {
  return useClientFeatures().data?.chat;
}
