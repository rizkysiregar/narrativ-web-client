import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSession } from "~/api/session";
import { useLogout } from "../api";
import { Button } from "~/shared/ui/button";

/** Who is signed in, and the way out. `compact` is the icon-only version of the phone top bar. */
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const username = useSession((state) => state.user?.username);
  const logout = useLogout();

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        aria-label={t("auth.logout")}
        disabled={logout.isPending}
        onClick={() => {
          logout.mutate();
        }}
      >
        <LogOut className="size-5" aria-hidden="true" />
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {username && (
        <p className="truncate px-3 text-sm text-muted">
          {t("auth.signedInAs", { username: `@${username}` })}
        </p>
      )}
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
