import { useTranslation } from "react-i18next";

import { DeleteAccount } from "~/features/account";
import { APP_NAME } from "~/shared/config/env";
import { PageHeader } from "~/shared/ui/page-header";

import type { Route } from "./+types/settings-delete";

export const meta: Route.MetaFunction = () => [{ title: `Delete account · ${APP_NAME}` }];

export default function Page() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t("settings.deleteAccount")} back />
      <DeleteAccount />
    </>
  );
}
