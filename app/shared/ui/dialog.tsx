import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "~/shared/lib/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * A modal on the native <dialog>: the browser traps focus, closes it on Escape and makes the page behind inert.
 * Closing (Escape, the close button, a click on the backdrop) calls onClose; `open` stays the parent's state.
 */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      // jsdom has no showModal or close
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // a click on the backdrop lands on the dialog element itself
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className={cn(
        "m-auto w-[min(100%-2rem,36rem)] rounded-2xl border border-line bg-ink p-0 text-fg backdrop:bg-ink/70 backdrop:backdrop-blur-sm",
        className,
      )}
    >
      {open && (
        <div className="flex flex-col gap-4 p-5">
          <header className="flex items-center justify-between gap-4">
            <h2 id={titleId} className="heading text-xl">
              {title}
            </h2>
            <button
              type="button"
              aria-label={t("common.close")}
              className="-mr-2 rounded-full p-2 text-muted hover:bg-plum hover:text-fg"
              onClick={onClose}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
