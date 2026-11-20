import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { buttonVariants } from "~/shared/ui/button";
import { PageMessage } from "~/shared/ui/page-message";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <PageMessage title={t("notFound.title")} body={t("notFound.body")}>
      <Link to="/" className={buttonVariants()}>
        {t("notFound.back")}
      </Link>
    </PageMessage>
  );
}
