import { useTranslation } from "react-i18next";

import { EditProfile } from "~/features/account";
import { APP_NAME } from "~/shared/config/env";
import { PageHeader } from "~/shared/ui/page-header";

import type { Route } from "./+types/settings-profile";

export const meta: Route.MetaFunction = () => [{ title: `Edit profile · ${APP_NAME}` }];

export default function Page() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t("settings.profile")} back />
      <EditProfile />
    </>
  );
}
