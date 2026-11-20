import { BellRing } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { readPreference, writePreference } from "~/shared/lib/storage";
import { Button } from "~/shared/ui/button";

import { useWebPushConfig } from "../api";
import { pushState } from "../push";
import { PushToggle } from "./push-toggle";

const DISMISSED_KEY = "narrativ.pushPromptDismissed";

/**
 * Offers push on the notifications page, where it makes sense to the user, never as a permission prompt on load.
 * "Not now" hides it for this browser; Settings keeps the switch.
 */
export function PushPrompt() {
  const { t } = useTranslation();
  const config = useWebPushConfig();
  const [hidden, setHidden] = useState(() => readPreference(DISMISSED_KEY) !== null || pushState() !== "off");

  if (hidden || !config.data?.enabled) {
    return null;
  }
  return (
    <section className="m-4 flex flex-col gap-3 rounded-2xl border border-line bg-plum p-4 sm:flex-row sm:items-center">
      <BellRing className="size-6 shrink-0 text-lilac" aria-hidden="true" />
      <p className="flex-1 text-sm">{t("push.prompt")}</p>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            writePreference(DISMISSED_KEY, "1");
            setHidden(true);
          }}
        >
          {t("push.notNow")}
        </Button>
        <PushToggle />
      </div>
    </section>
  );
}
