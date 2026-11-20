import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router";

import { ApiError } from "~/api/errors";
import { useSession } from "~/api/session";
import { profileMeta, PublicProfilePreview } from "~/features/share";
import { fetchPublicProfile } from "~/features/share/public-api.server";
import { ProfileHeader, useUserByUsername } from "~/features/users";
import { publicOrigin } from "~/server/config.server";
import { cn } from "~/shared/lib/cn";
import { PageHeader } from "~/shared/ui/page-header";
import { PageMessage } from "~/shared/ui/page-message";
import { QueryState } from "~/shared/ui/query-state";

import type { ShellHandle } from "./shell";
import type { Route } from "./+types/profile";

export const handle: ShellHandle = { publicPreview: true };

/** On the server, for a shared link: the public profile, for the link preview tags and for a visitor. */
export async function loader({ request, params }: Route.LoaderArgs) {
  return { profile: await fetchPublicProfile(request, params.username), origin: publicOrigin(request) };
}

export function clientLoader() {
  return null;
}

export const meta: Route.MetaFunction = ({ loaderData, location }) =>
  profileMeta(loaderData?.profile ?? null, loaderData?.origin ?? "", location.pathname);

export default function Profile({ params, loaderData }: Route.ComponentProps) {
  const signedIn = useSession((state) => state.status === "authenticated");

  return signedIn ? (
    <ProfileView username={params.username} />
  ) : (
    <PublicProfilePreview profile={loaderData?.profile ?? null} />
  );
}

/** A user's profile: the header, then the posts or media tab (the nested route). */
function ProfileView({ username }: { username: string }) {
  const { t } = useTranslation();
  const user = useUserByUsername(username);

  if (!user.data) {
    return (
      <>
        <PageHeader title={`@${username}`} back />
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
      <PageHeader title={`@${user.data.username ?? username}`} back />
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
