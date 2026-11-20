import { Ban, Flag, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { errorMessage } from "~/shared/lib/error-message";
import { ConfirmDialog } from "~/shared/ui/confirm-dialog";
import { Dialog } from "~/shared/ui/dialog";

import { useBlock, type ReportTarget } from "../api";
import { ReportDialog } from "./report-dialog";

interface SafetyMenuProps {
  /** What a report is about: the post or comment, or the user themselves. */
  target: ReportTarget;
  user: { id: string; username: string };
  /** After blocking, e.g. leave the blocked user's profile. */
  onBlocked?: (() => void) | undefined;
}

/** The "more" button on someone else's post, comment or profile: report it, or block its author. */
export function SafetyMenu({ target, user, onBlocked }: SafetyMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<"menu" | "report" | "block" | null>(null);
  const block = useBlock();
  const close = () => {
    setOpen(null);
  };

  const item = "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-plum";
  return (
    <>
      <button
        type="button"
        aria-label={t("safety.more")}
        className="rounded-full p-1.5 text-muted transition-colors hover:bg-plum hover:text-fg"
        onClick={() => {
          setOpen("menu");
        }}
      >
        <MoreHorizontal className="size-4.5" aria-hidden="true" />
      </button>
      <Dialog
        open={open === "menu"}
        onClose={close}
        title={t("safety.options")}
        className="w-[min(100%-2rem,22rem)]"
      >
        <div className="flex flex-col">
          <button
            type="button"
            className={item}
            onClick={() => {
              setOpen("report");
            }}
          >
            <Flag className="size-5" aria-hidden="true" />
            {t(`safety.report.action.${target.type}`, { username: user.username })}
          </button>
          <button
            type="button"
            className={`${item} text-danger`}
            onClick={() => {
              setOpen("block");
            }}
          >
            <Ban className="size-5" aria-hidden="true" />
            {t("safety.block.action", { username: user.username })}
          </button>
        </div>
      </Dialog>
      <ReportDialog target={target} open={open === "report"} onClose={close} />
      <ConfirmDialog
        open={open === "block"}
        title={t("safety.block.title", { username: user.username })}
        body={t("safety.block.body")}
        confirmLabel={t("safety.block.confirm")}
        busy={block.isPending}
        onClose={close}
        onConfirm={() => {
          block.mutate(
            { userId: user.id, block: true },
            {
              onSuccess: () => {
                close();
                toast.success(t("safety.block.done", { username: user.username }));
                onBlocked?.();
              },
              onError: (error) => toast.error(errorMessage(error, t)),
            },
          );
        }}
      />
    </>
  );
}
