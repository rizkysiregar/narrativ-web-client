import { LogOut, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useSession } from "~/api/session";
import { useLogout } from "../api";
import { Button, buttonVariants } from "~/shared/ui/button";

/** Who is signed in, settings and the way out. `compact` is the settings icon of the phone top bar (sign out is in settings). */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const username = useSession((state) => state.user?.username);
  const logout = useLogout();

  if (compact) {
    return (
      <Link
        to="/settings"
        aria-label={t("settings.title")}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <Settings className="size-5" aria-hidden="true" />
      </Link>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {username && (
        <p className="truncate px-3 text-sm text-muted">
          {t("auth.signedInAs", { username: `@${username}` })}
        </p>
      )}
      <Link to="/settings" className={buttonVariants({ variant: "ghost", className: "justify-start" })}>
        <Settings className="size-5" aria-hidden="true" />
        {t("settings.title")}
      </Link>
      <Button
        variant="ghost"
        className="justify-start"
        disabled={logout.isPending}
        onClick={() => {
          logout.mutate();
        }}
      >
        <LogOut className="size-5" aria-hidden="true" />
        {t("auth.logout")}
      </Button>
    </div>
  );
}
