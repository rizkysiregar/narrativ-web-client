import { ChevronRight, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useLogout } from "~/features/auth";
import { PushToggle } from "~/features/push";
import { LANDING_URL } from "~/shared/config/env";
import { LanguageSwitcher } from "~/shared/layout/language-switcher";

function Row({ to, children, danger = false }: { to: string; children: ReactNode; danger?: boolean }) {
  const external = to.startsWith("http");
  const className = `flex items-center justify-between px-4 py-4 transition-colors hover:bg-plum ${danger ? "text-danger" : ""}`;
  const content = (
    <>
      <span>{children}</span>
      <ChevronRight className="size-5 text-muted" aria-hidden="true" />
    </>
  );
  return (
    <li className="border-b border-line">
      {external ? (
        <a href={to} target="_blank" rel="noreferrer" className={className}>
          {content}
        </a>
      ) : (
        <Link to={to} className={className}>
          {content}
        </Link>
      )}
    </li>
  );
}

export function SettingsMenu() {
  const { t, i18n } = useTranslation();
  const logout = useLogout();
  const legal = (page: string) => `${LANDING_URL}${i18n.language === "en" ? "/en" : ""}/${page}`;

  return (
    <div className="flex flex-col">
      <h2 className="px-4 pt-6 pb-2 text-sm font-semibold text-muted">{t("settings.account")}</h2>
      <ul>
        <Row to="/settings/profile">{t("settings.profile")}</Row>
        <Row to="/settings/email">{t("settings.email")}</Row>
        <Row to="/settings/blocked">{t("settings.blocked")}</Row>
      </ul>
      <h2 className="px-4 pt-6 pb-2 text-sm font-semibold text-muted">{t("settings.app")}</h2>
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
        <span>{t("push.label")}</span>
        <PushToggle />
      </div>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span>{t("language.label")}</span>
        <LanguageSwitcher />
      </div>
      <ul>
        <Row to={legal("privacy")}>{t("settings.privacy")}</Row>
        <Row to={legal("terms")}>{t("settings.terms")}</Row>
      </ul>
      <ul className="mt-6">
        <Row to="/settings/delete-account" danger>
          {t("settings.deleteAccount")}
        </Row>
      </ul>
      <button
        type="button"
        disabled={logout.isPending}
        onClick={() => {
          logout.mutate();
        }}
        className="mt-6 flex items-center gap-3 px-4 py-4 text-left font-semibold transition-colors hover:bg-plum"
      >
        <LogOut className="size-5" aria-hidden="true" />
        {t("auth.logout")}
      </button>
    </div>
  );
}
