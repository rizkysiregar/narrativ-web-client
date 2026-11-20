import { PenSquare } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "~/shared/ui/button";
import { Dialog } from "~/shared/ui/dialog";

import { Composer } from "./composer";

/** Opens the composer. `compact` is the round floating button of the phone layout. */
export function CreatePostButton({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };

  return (
    <>
      {compact ? (
        <Button
          size="lg"
          aria-label={t("composer.open")}
          className="size-14 px-0 shadow-lg shadow-ink"
          onClick={() => {
            setOpen(true);
          }}
        >
          <PenSquare className="size-6" aria-hidden="true" />
        </Button>
      ) : (
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            setOpen(true);
          }}
        >
          <PenSquare className="size-5" aria-hidden="true" />
          {t("composer.open")}
        </Button>
      )}
      <Dialog open={open} onClose={close} title={t("composer.title")}>
        {/* mounted only while open: closing discards the draft and cancels running uploads */}
        {open && <Composer onDone={close} />}
      </Dialog>
    </>
  );
}
