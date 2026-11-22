import { MarpokatClient, indexedDbCache } from "@rizkysiregar/marpokat-core";

import { fetchChatCredentials, type ChatCredentials } from "./api";

/**
 * The chat client of one user. The credentials fetched to learn the service address also give the first token; the
 * SDK asks the backend for a new one whenever the last one is about to run out.
 */
export function createChatClient(initial: ChatCredentials): MarpokatClient {
  let initialUsed = false;
  return new MarpokatClient({
    baseUrl: initial.baseUrl,
    apiKey: initial.apiKey,
    tokenProvider: async () => {
      if (!initialUsed && Date.parse(initial.expiresAt) - Date.now() > 60_000) {
        initialUsed = true;
        return initial.token;
      }
      return (await fetchChatCredentials()).token;
    },
    // one cache per user: nobody sees the conversations of the account that used this browser before
    cache: typeof indexedDB === "undefined" ? undefined : indexedDbCache(`narrativ:${initial.userId}`),
  });
}
