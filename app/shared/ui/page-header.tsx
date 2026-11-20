import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

/** The sticky title bar of a page, with a back button where the page is reached from another one. */
export function PageHeader({
  title,
  back = false,
  children,
}: {
  title: string;
  back?: boolean;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-[5] border-b border-line bg-ink/90 backdrop-blur md:top-0">
      <div className="flex items-center gap-2 px-4 py-3">
        {back && (
          <button
            type="button"
            aria-label={t("page.back")}
            className="-ml-2 rounded-full p-2 text-muted hover:bg-plum hover:text-fg"
            onClick={() => void navigate(-1)}
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
        )}
        <h1 className="heading truncate text-xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}
