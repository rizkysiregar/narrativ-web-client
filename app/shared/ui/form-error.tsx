import { useTranslation } from "react-i18next";

import { errorMessage } from "~/shared/lib/error-message";
import { Alert } from "./alert";

/** The failure of the last submit, in the words of the backend when it gave some. */
export function FormError({ error }: { error: unknown }) {
  const { t } = useTranslation();

  if (!error) {
    return null;
  }
  return <Alert>{errorMessage(error, t)}</Alert>;
}
