import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router";

import { ApiError } from "~/api/errors";
import { ProfileHeader, useUserByUsername } from "~/features/users";
import { APP_NAME } from "~/shared/config/env";
import { cn } from "~/shared/lib/cn";
import { PageHeader } from "~/shared/ui/page-header";
import { PageMessage } from "~/shared/ui/page-message";
import { QueryState } from "~/shared/ui/query-state";

import type { Route } from "./+types/profile";

export const meta: Route.MetaFunction = ({ params }) => [{ title: `@${params.username} · ${APP_NAME}` }];

/** A user's profile: the header, then the posts or media tab (the nested route). */
export default function Profile({ params }: Route.ComponentProps) {
  const { t } = useTranslation();
  const user = useUserByUsername(params.username);

  if (!user.data) {
    return (
      <>
        <PageHeader title={`@${params.username}`} back />
        {user.error instanceof ApiError && user.error.status === 404 ? (
          <PageMessage title={t("profile.notFound")} body={t("profile.notFoundBody")} />
        ) : (
          <QueryState error={user.error} onRetry={() => void user.refetch()} />
        )}
      </>
    );
  }

  const tab = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex-1 border-b-2 py-3 text-center font-semibold transition-colors",
      isActive ? "border-lilac text-fg" : "border-transparent text-muted hover:text-fg",
    );
  return (
    <>
      <PageHeader title={`@${user.data.username ?? params.username}`} back />
      <ProfileHeader user={user.data} />
      <nav aria-label={t("profile.tabs")} className="flex border-b border-line">
        <NavLink to="." end className={tab}>
          {t("profile.posts")}
        </NavLink>
        <NavLink to="media" className={tab}>
          {t("profile.media")}
        </NavLink>
      </nav>
      <Outlet />
    </>
  );
}
