import { useTranslation } from "react-i18next";
import { useMatches } from "react-router";

import { NAV_ITEMS } from "~/shared/layout/nav";
import { PageMessage } from "~/shared/ui/page-message";

export default function ComingSoon() {
  const { t } = useTranslation();
  const routeId = useMatches().at(-1)?.id;
  const item = NAV_ITEMS.find(({ labelKey }) => labelKey === `nav.${routeId ?? ""}`);

  return <PageMessage title={item ? t(item.labelKey) : t("comingSoon.title")} body={t("comingSoon.body")} />;
}
