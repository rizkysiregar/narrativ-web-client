import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { Input } from "~/shared/ui/input";

/**
 * The search field at the top of home. The term lives in ?q= (and the tab in ?tab=), so a search can be shared and
 * survives a reload; clearing it brings the feed back.
 */
export function SearchBox() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const term = searchParams.get("q") ?? "";

  const change = (next: string) => {
    setSearchParams(
      (params) => {
        if (next) {
          params.set("q", next);
        } else {
          params.delete("q");
          params.delete("tab");
        }
        return params;
      },
      { replace: true },
    );
  };

  return (
    <div className="px-4 pb-3">
      <label className="relative block">
        <span className="sr-only">{t("search.label")}</span>
        <Search className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <Input
          type="search"
          value={term}
          placeholder={t("search.placeholder")}
          autoCapitalize="none"
          enterKeyHint="search"
          className="pr-11 pl-11 [&::-webkit-search-cancel-button]:hidden"
          onChange={(event) => {
            change(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              change("");
            }
          }}
        />
        {term && (
          <button
            type="button"
            aria-label={t("search.clear")}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-ink hover:text-fg"
            onClick={() => {
              change("");
            }}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </label>
    </div>
  );
}
