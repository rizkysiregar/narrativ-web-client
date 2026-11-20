import { useTranslation } from "react-i18next";

import { ChangeEmail } from "~/features/account";
import { APP_NAME } from "~/shared/config/env";
import { PageHeader } from "~/shared/ui/page-header";

import type { Route } from "./+types/settings-email";

export const meta: Route.MetaFunction = () => [{ title: `Change email · ${APP_NAME}` }];

export default function Page() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t("settings.email")} back />
      <ChangeEmail />
    </>
  );
}
