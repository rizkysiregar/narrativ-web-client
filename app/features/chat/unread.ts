import { useSyncExternalStore } from "react";

import { useChatClient } from "./provider";

const NEVER = () => () => undefined;

/** Unread messages over all conversations, for the badge on the navigation. 0 while chat is not available. */
export function useChatUnread(): number {
  const client = useChatClient();
  return useSyncExternalStore(
    client ? client.subscribe : NEVER,
    () => client?.getSnapshot().unreadTotal ?? 0,
    () => 0,
  );
}
