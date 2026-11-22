import { useMutation } from "@tanstack/react-query";

import { api } from "~/api/client";
import { request } from "~/api/errors";

/** What the backend hands out to connect to the chat service. */
export interface ChatCredentials {
  token: string;
  expiresAt: string;
  apiKey: string;
  baseUrl: string;
  userId: string;
}

export async function fetchChatCredentials(signal?: AbortSignal): Promise<ChatCredentials> {
  const body = await request(api.POST("/chat/token", { signal }));
  if (!body.token || !body.apiKey || !body.baseUrl || !body.userId || !body.expiresAt) {
    throw new Error("The chat token answer is incomplete");
  }
  return {
    token: body.token,
    expiresAt: body.expiresAt,
    apiKey: body.apiKey,
    baseUrl: body.baseUrl,
    userId: body.userId,
  };
}

/** Opens (creating it when needed) the direct message with a user and resolves to the channel id. */
export function useOpenDirectMessage() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const body = await request(api.POST("/chat/dm/{userId}", { params: { path: { userId } } }));
      if (!body.channelId) {
        throw new Error("The direct message answer has no channel");
      }
      return body.channelId;
    },
  });
}
