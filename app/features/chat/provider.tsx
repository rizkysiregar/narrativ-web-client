import { useQuery } from "@tanstack/react-query";
import type { MarpokatClient } from "@rizkysiregar/marpokat-core";
import { MarpokatProvider } from "@rizkysiregar/marpokat-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { ApiError } from "~/api/errors";
import { useSession } from "~/api/session";
import { useChatEnabled } from "~/features/app-config";
import { currentPushToken, onPushTokenChange } from "~/features/push";

import { fetchChatCredentials, type ChatCredentials } from "./api";
import { createChatClient } from "./client";

const ClientContext = createContext<MarpokatClient | null>(null);

/** The chat client, or null while it loads and when the chat service is off or unreachable. */
export function useChatClient(): MarpokatClient | null {
  return useContext(ClientContext);
}

/** Whether chat is up for this user. */
export function useChatAvailable(): boolean {
  return useChatClient() !== null;
}

/**
 * Connects the signed-in user to the chat service. Chat is optional: while an admin has it switched off
 * (feature.chat.enabled) nothing connects, and when the backend cannot give a token (403 switched off, 503 the service
 * is off) the rest of the app works and the chat entries stay hidden.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const signedIn = useSession((state) => state.status === "authenticated");
  const chatEnabled = useChatEnabled() === true;
  const credentials = useQuery({
    queryKey: ["chat", "credentials"],
    queryFn: ({ signal }) => fetchChatCredentials(signal),
    enabled: signedIn && chatEnabled,
    staleTime: Infinity,
    gcTime: 0,
    retry: (count, error) =>
      !(error instanceof ApiError && (error.status === 503 || error.status === 403)) && count < 2,
  });

  // switched off while connected: unmounting the client closes its connection
  if (!chatEnabled || !credentials.data) {
    return <ClientContext.Provider value={null}>{children}</ClientContext.Provider>;
  }
  // keyed by user: a different account in the same shell gets a client of its own
  return (
    <Connected key={credentials.data.userId} credentials={credentials.data}>
      {children}
    </Connected>
  );
}

function Connected({ credentials, children }: { credentials: ChatCredentials; children: ReactNode }) {
  const [client] = useState(() => createChatClient(credentials));

  // the chat service pushes new messages to this browser itself, so it gets the same token as the backend: while
  // push is on, at every load (tokens rotate) and when it is turned on; turning it off or signing out removes it
  useEffect(() => {
    let registered: string | null = null;
    const register = (token: string) => {
      if (token === registered) {
        return;
      }
      registered = token;
      // the client keeps the token and retries by itself; a refused one is only worth ignoring
      void client.registerPushToken(token).catch(() => undefined);
    };
    const initial = currentPushToken();
    if (initial) {
      register(initial);
    }
    return onPushTokenChange(async (token, previous) => {
      if (previous && previous !== token) {
        await client.unregisterPushToken(previous).catch(() => undefined);
      }
      if (token) {
        register(token);
      } else {
        registered = null;
      }
    });
  }, [client]);

  useEffect(() => {
    return () => {
      // the user signed out (the shell left): forget the conversations stored in this browser too
      if (useSession.getState().status !== "authenticated") {
        void client.reset();
      }
    };
  }, [client]);

  return (
    <ClientContext.Provider value={client}>
      <MarpokatProvider client={client}>{children}</MarpokatProvider>
    </ClientContext.Provider>
  );
}
