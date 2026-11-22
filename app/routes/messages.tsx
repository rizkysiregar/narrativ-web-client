import { ConversationList } from "~/features/chat";
import { APP_NAME } from "~/shared/config/env";
import { PageHeader } from "~/shared/ui/page-header";
import { useTranslation } from "react-i18next";

import type { Route } from "./+types/messages";

export const meta: Route.MetaFunction = () => [{ title: `Messages · ${APP_NAME}` }];

export default function Messages() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("nav.messages")} />
      <ConversationList />
    </>
  );
}
