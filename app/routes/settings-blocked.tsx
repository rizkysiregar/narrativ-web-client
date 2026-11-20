import { useTranslation } from "react-i18next";

import { BlockedUsers } from "~/features/safety";
import { APP_NAME } from "~/shared/config/env";
import { PageHeader } from "~/shared/ui/page-header";

import type { Route } from "./+types/settings-blocked";

export const meta: Route.MetaFunction = () => [{ title: `Blocked accounts · ${APP_NAME}` }];

export default function Page() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t("settings.blocked")} back />
      <BlockedUsers />
    </>
  );
}
