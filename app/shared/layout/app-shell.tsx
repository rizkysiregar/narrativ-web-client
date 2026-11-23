import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";

import { cn } from "~/shared/lib/cn";
import { Logo, LogoMark } from "~/shared/ui/logo";

import { LanguageSwitcher } from "./language-switcher";
import { NAV_ITEMS, type NavItem } from "./nav";
import { OfflineBanner } from "./offline-banner";

interface AppShellProps {
  children: ReactNode;
  /** The main call to action (create a post): under the navigation on wide screens, a floating button on phones. */
  primaryAction?: ReactNode;
  floatingAction?: ReactNode;
  /** Who is signed in and the way out: in the sidebar, and its compact form in the phone top bar. */
  account?: ReactNode;
  accountCompact?: ReactNode;
  /** Counts shown on navigation items, e.g. unread notifications. */
  badges?: Partial<Record<NavItem["labelKey"], number>>;
  /** Navigation items left out, e.g. messages while chat is switched off. */
  hiddenItems?: readonly NavItem["labelKey"][];
}

/**
 * Sidebar on wide screens, a top bar and a bottom tab bar on phones. What is feature-specific (account, create post)
 * comes in through the slots, so the layout knows no feature.
 */
export function AppShell({
  children,
  primaryAction,
  floatingAction,
  account,
  accountCompact,
  badges = {},
  hiddenItems = [],
}: AppShellProps) {
  const { t } = useTranslation();
  const navItems = NAV_ITEMS.filter((item) => !hiddenItems.includes(item.labelKey));

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between border-r border-line px-4 py-6 md:flex">
        <div className="flex flex-col gap-8">
          <NavLink to="/" className="px-3">
            <Logo />
          </NavLink>
          <nav aria-label={t("nav.main")}>
            <ul className="flex flex-col gap-1">
              {navItems.map(({ to, labelKey, icon: Icon }) => (
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
                    <NavIcon icon={Icon} count={badges[labelKey]} />
                    {t(labelKey)}
                    {Boolean(badges[labelKey]) && (
                      <span className="sr-only">{t("nav.unread", { count: badges[labelKey] })}</span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          {primaryAction}
        </div>
        <div className="flex flex-col gap-4">
          {account}
          <div className="px-3">
            <LanguageSwitcher />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-ink/90 px-4 py-3 backdrop-blur md:hidden">
          <NavLink to="/" aria-label={t("nav.home")}>
            <LogoMark className="h-7" />
          </NavLink>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            {accountCompact}
          </div>
        </header>
        <OfflineBanner />
        <main className="mx-auto w-full max-w-2xl flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      {floatingAction && (
        <div className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 md:hidden">
          {floatingAction}
        </div>
      )}

      <nav
        aria-label={t("nav.main")}
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="flex justify-around">
          {navItems.map(({ to, labelKey, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                aria-label={
                  badges[labelKey]
                    ? `${t(labelKey)}, ${t("nav.unread", { count: badges[labelKey] })}`
                    : t(labelKey)
                }
                className={({ isActive }) =>
                  cn("flex size-14 items-center justify-center", isActive ? "text-fg" : "text-muted")
                }
              >
                <NavIcon icon={Icon} count={badges[labelKey]} />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function NavIcon({ icon: Icon, count }: { icon: NavItem["icon"]; count: number | undefined }) {
  return (
    <span className="relative">
      <Icon className="size-6" aria-hidden="true" />
      {Boolean(count) && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-2 min-w-4.5 rounded-full bg-blush px-1 text-center text-[0.7rem] leading-4.5 font-bold text-ink"
        >
          {count !== undefined && count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
}
