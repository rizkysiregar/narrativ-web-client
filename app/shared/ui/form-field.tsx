import { cloneElement, useId, type ReactElement } from "react";
import type { FieldError } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface FieldControlProps {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

interface FormFieldProps {
  label: string;
  /** A react-hook-form error; its message is a translation key from the form's Zod schema. */
  error?: FieldError | undefined;
  hint?: string;
  children: ReactElement<FieldControlProps>;
}

/** A label, the control and its error or hint, wired together for screen readers. */
export function FormField({ label, error, hint, children }: FormFieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const messageId = `${id}-message`;
  // Zod messages are keys like "validation.username.size"; a key without a text is shown as is
  const message = error?.message ? t(error.message as never) : hint;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": message ? messageId : undefined,
      })}
      {message && (
        <p id={messageId} className={error ? "text-sm text-danger" : "text-sm text-muted"}>
          {message}
        </p>
      )}
    </div>
  );
}
