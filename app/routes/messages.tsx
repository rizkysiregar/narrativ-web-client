import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";

import { useChatEnabled } from "~/features/app-config";
import { ConversationList } from "~/features/chat";
import { APP_NAME } from "~/shared/config/env";
import { PageHeader } from "~/shared/ui/page-header";

import type { Route } from "./+types/messages";

export const meta: Route.MetaFunction = () => [{ title: `Messages · ${APP_NAME}` }];

export default function Messages() {
  const { t } = useTranslation();
  // an admin switched chat off: a bookmark or an old link lands on the home feed
  if (useChatEnabled() === false) {
    return <Navigate to="/" replace />;
  }
  return (
    <>
      <PageHeader title={t("nav.messages")} />
      <ConversationList />
    </>
  );
}
