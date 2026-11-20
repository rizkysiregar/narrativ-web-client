import { Navigate, Outlet, useLocation, useMatches } from "react-router";

import { restoreSession, useSession } from "~/api/session";
import { UserMenu } from "~/features/auth";
import { useUnreadCount } from "~/features/notifications";
import { CreatePostButton } from "~/features/posts";
import { PublicFrame } from "~/features/share";
import { AppShell } from "~/shared/layout/app-shell";
import { Splash } from "~/shared/ui/splash";

/**
 * Before the layout first renders in the browser (the server renders the start-up screen meanwhile): whether the
 * refresh cookie still holds a session. A no-op once the session is known.
 */
export async function clientLoader() {
  await restoreSession();
  return null;
}
clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return <Splash />;
}

/** Route handle of pages a visitor without a session may see (shared links): they get a public preview. */
export interface ShellHandle {
  publicPreview?: boolean;
}

export default function Shell() {
  const status = useSession((state) => state.status);
  const location = useLocation();
  const publicPreview = useMatches().some(
    (match) => (match.handle as ShellHandle | undefined)?.publicPreview,
  );
  // hooks run before the redirect below, so the badge only asks once there is a session
  const unread = useUnreadCount(status === "authenticated");

  // no session at start-up, a sign-out, or a session that ended (a refused refresh, a ban): shared links show their
  // public preview, everything else needs signing in
  if (status !== "authenticated") {
    if (publicPreview) {
      return (
        <PublicFrame>
          <Outlet />
        </PublicFrame>
      );
    }
    const redirect = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={redirect === "/" ? "/login" : `/login?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    );
  }
  return (
    <AppShell
      primaryAction={<CreatePostButton />}
      floatingAction={<CreatePostButton compact />}
      account={<UserMenu />}
      accountCompact={<UserMenu compact />}
      badges={{ "nav.notifications": unread.data ?? 0 }}
    >
      <Outlet />
    </AppShell>
  );
}
