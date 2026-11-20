import { Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { cn } from "~/shared/lib/cn";

interface ShareButtonProps {
  /** Path in the app, e.g. /p/123; shared as an absolute link of this origin. */
  path: string;
  title: string;
  label: string;
  className?: string;
}

/** The system share sheet where there is one (phones), otherwise the link goes to the clipboard. */
export function ShareButton({ path, title, label, className }: ShareButtonProps) {
  const { t } = useTranslation();

  const share = async () => {
    const url = `${location.origin}${path}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
      } catch {
        // the user closed the share sheet
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("share.copied"));
    } catch {
      toast.error(t("share.copyFailed"));
    }
  };

  return (
    <button
      type="button"
      aria-label={label}
      className={cn("rounded-full p-1.5 text-muted transition-colors hover:bg-plum hover:text-fg", className)}
      onClick={() => void share()}
    >
      <Share2 className="size-4.5" aria-hidden="true" />
    </button>
  );
}
