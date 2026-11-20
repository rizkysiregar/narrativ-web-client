import type { TFunction } from "i18next";

import { ApiError } from "~/api/errors";

/** What to tell the user about a failed call. The backend's own message is already in the user's language. */
export function errorMessage(error: unknown, t: TFunction): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) {
      return t("errors.network");
    }
    if (error.status < 500 && error.message) {
      return error.message;
    }
  }
  return t("errors.unexpected");
}
