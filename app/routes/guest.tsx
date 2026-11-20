import { Navigate, Outlet, useSearchParams } from "react-router";

import { restoreSession, useSession } from "~/api/session";
import { safeRedirect } from "~/shared/lib/safe-redirect";
import { LanguageSwitcher } from "~/shared/layout/language-switcher";
import { Logo } from "~/shared/ui/logo";
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

export default function GuestLayout() {
  const status = useSession((state) => state.status);
  const [searchParams] = useSearchParams();

  // also what moves a user on right after signing in or registering
  if (status === "authenticated") {
    return <Navigate to={safeRedirect(searchParams.get("redirect"))} replace />;
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Logo />
        <LanguageSwitcher />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 items-start px-4 pt-6 pb-16 sm:items-center sm:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
