import { Navigate } from "react-router";

import { useChatEnabled } from "~/features/app-config";
import { Conversation } from "~/features/chat";
import { APP_NAME } from "~/shared/config/env";

import type { Route } from "./+types/message-thread";

export const meta: Route.MetaFunction = () => [{ title: `Messages · ${APP_NAME}` }];

export default function MessageThread({ params }: Route.ComponentProps) {
  // an admin switched chat off: a bookmark or an old link lands on the home feed
  if (useChatEnabled() === false) {
    return <Navigate to="/" replace />;
  }
  return <Conversation channelId={params.channelId} />;
}
