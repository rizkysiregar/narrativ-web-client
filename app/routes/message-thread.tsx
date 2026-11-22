import { Conversation } from "~/features/chat";
import { APP_NAME } from "~/shared/config/env";

import type { Route } from "./+types/message-thread";

export const meta: Route.MetaFunction = () => [{ title: `Messages · ${APP_NAME}` }];

export default function MessageThread({ params }: Route.ComponentProps) {
  return <Conversation channelId={params.channelId} />;
}
