import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { errorMessage } from "~/shared/lib/error-message";

import { Button } from "./button";
import { Spinner } from "./spinner";

/** Loading spinner, or the error with a retry, for a query that has nothing to show yet. */
export function QueryState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();

  if (!error) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t("list.loading")} />
      </div>
    );
  }
  return (
    <div role="alert" className="flex flex-col items-center gap-4 px-4 py-16 text-center">
      <p className="text-muted">{errorMessage(error, t)}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {t("list.retry")}
      </Button>
    </div>
  );
}

/** A short, centered message for an empty list. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
      <p className="heading text-xl">{title}</p>
      {children && <p className="max-w-sm text-muted">{children}</p>}
    </div>
  );
}
