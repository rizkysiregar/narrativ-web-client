import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import { LanguageSwitcher } from "~/shared/layout/language-switcher";
import { buttonVariants } from "~/shared/ui/button";
import { Logo } from "~/shared/ui/logo";

/** The page around a shared post or profile for a visitor without a session: the brand and the way in. */
export function PublicFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  // after signing in, back to what was shared
  const redirect = `?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-ink/90 px-4 py-3 backdrop-blur sm:px-8">
        <Link to="/login" aria-label="NARRATIV">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link to={`/login${redirect}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {t("share.signIn")}
          </Link>
          <Link to={`/register${redirect}`} className={buttonVariants({ size: "sm" })}>
            {t("share.join")}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1">{children}</main>
    </div>
  );
}

/** The invitation under a shared post or profile. */
export function JoinPrompt({ text }: { text: string }) {
  const { t } = useTranslation();
  const location = useLocation();
  const redirect = `?redirect=${encodeURIComponent(location.pathname)}`;

  return (
    <section className="m-4 flex flex-col items-center gap-3 rounded-2xl border border-line bg-plum p-6 text-center">
      <p className="heading text-xl">{text}</p>
      <div className="flex gap-2">
        <Link to={`/register${redirect}`} className={buttonVariants()}>
          {t("share.join")}
        </Link>
        <Link to={`/login${redirect}`} className={buttonVariants({ variant: "secondary" })}>
          {t("share.signIn")}
        </Link>
      </div>
    </section>
  );
}
