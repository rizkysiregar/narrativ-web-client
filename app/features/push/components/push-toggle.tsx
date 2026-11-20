import { BellOff, BellRing } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { errorMessage } from "~/shared/lib/error-message";
import { Button } from "~/shared/ui/button";

import { useWebPushConfig } from "../api";
import { disablePush, enablePush, PushPermissionError, pushState, type PushState } from "../push";

/** Turns push notifications for this browser on or off, and explains when it cannot. */
export function PushToggle() {
  const { t } = useTranslation();
  const config = useWebPushConfig();
  const [state, setState] = useState<PushState>(pushState);
  const [busy, setBusy] = useState(false);

  if (state === "unsupported" || config.data?.enabled === false) {
    return <p className="text-sm text-muted">{t("push.unavailable")}</p>;
  }
  if (state === "denied") {
    return <p className="text-sm text-muted">{t("push.denied")}</p>;
  }
  const turn = async (on: boolean) => {
    if (!config.data) {
      return;
    }
    setBusy(true);
    try {
      if (on) {
        await enablePush(config.data);
        toast.success(t("push.enabled"));
      } else {
        await disablePush(config.data);
      }
    } catch (error) {
      if (!(error instanceof PushPermissionError)) {
        toast.error(errorMessage(error, t));
      }
    } finally {
      setState(pushState());
      setBusy(false);
    }
  };

  return state === "on" ? (
    <Button variant="secondary" size="sm" disabled={busy} onClick={() => void turn(false)}>
      <BellOff className="size-4" aria-hidden="true" />
      {t("push.turnOff")}
    </Button>
  ) : (
    <Button size="sm" disabled={busy || !config.data} onClick={() => void turn(true)}>
      <BellRing className="size-4" aria-hidden="true" />
      {t("push.turnOn")}
    </Button>
  );
}
