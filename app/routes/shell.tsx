import { Navigate, Outlet, useLocation } from "react-router";

import { useSession } from "~/api/session";
import { AppShell } from "~/shared/layout/app-shell";

export default function Shell() {
  const status = useSession((state) => state.status);
  const location = useLocation();

  // no session at start-up, a sign-out, or a session that ended (a refused refresh, a ban)
  if (status !== "authenticated") {
    const redirect = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={redirect === "/" ? "/login" : `/login?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    );
  }
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
