import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useOnlineStatus } from "~/shared/hooks/use-online-status";

export function OfflineBanner() {
  const { t } = useTranslation();
  const online = useOnlineStatus();

  if (online) {
    return null;
  }
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-plum-2 px-4 py-2 text-sm text-fg">
      <WifiOff className="size-4" aria-hidden="true" />
      {t("offline")}
    </div>
  );
}
