import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";

import { cn } from "~/shared/lib/cn";
import { Logo, LogoMark } from "~/shared/ui/logo";

import { LanguageSwitcher } from "./language-switcher";
import { NAV_ITEMS } from "./nav";
import { OfflineBanner } from "./offline-banner";

/** Sidebar on wide screens, a top bar and a bottom tab bar on phones. */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between border-r border-line px-4 py-6 md:flex">
        <div className="flex flex-col gap-8">
          <NavLink to="/" className="px-3">
            <Logo />
          </NavLink>
          <nav aria-label={t("nav.main")}>
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-full px-3 py-2.5 text-lg transition-colors hover:bg-plum",
                        isActive ? "font-semibold text-fg" : "text-muted",
                      )
                    }
                  >
                    <Icon className="size-6" aria-hidden="true" />
                    {t(labelKey)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="px-3">
          <LanguageSwitcher />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-ink/90 px-4 py-3 backdrop-blur md:hidden">
          <NavLink to="/" aria-label={t("nav.home")}>
            <LogoMark className="h-7" />
          </NavLink>
          <LanguageSwitcher />
        </header>
        <OfflineBanner />
        <main className="mx-auto w-full max-w-2xl flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      <nav
        aria-label={t("nav.main")}
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="flex justify-around">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                aria-label={t(labelKey)}
                className={({ isActive }) =>
                  cn("flex size-14 items-center justify-center", isActive ? "text-fg" : "text-muted")
                }
              >
                <Icon className="size-6" aria-hidden="true" />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
