import { Inbox } from "~/features/notifications";
import { PushPrompt } from "~/features/push";
import { APP_NAME } from "~/shared/config/env";

import type { Route } from "./+types/notifications";

export const meta: Route.MetaFunction = () => [{ title: `Notifications · ${APP_NAME}` }];

export default function Notifications() {
  return <Inbox prompt={<PushPrompt />} />;
}
