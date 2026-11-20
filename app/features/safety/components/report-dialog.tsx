import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "~/shared/ui/button";
import { Dialog } from "~/shared/ui/dialog";
import { FormError } from "~/shared/ui/form-error";

import {
  MAX_REPORT_DESCRIPTION,
  REPORT_REASONS,
  useReport,
  type ReportReason,
  type ReportTarget,
} from "../api";

interface ReportDialogProps {
  target: ReportTarget;
  open: boolean;
  onClose: () => void;
}

/** Why the post, comment or user breaks the rules; "Other" needs a few words. Moderators see it in the admin panel. */
export function ReportDialog({ target, open, onClose }: ReportDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const descriptionId = useId();
  const report = useReport();
  const needsDescription = reason === "OTHER" && description.trim() === "";
  const close = () => {
    setReason(null);
    setDescription("");
    report.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title={t(`safety.report.title.${target.type}`)}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!reason) {
            return;
          }
          const text = description.trim();
          report.mutate(
            { targetType: target.type, targetId: target.id, reason, ...(text && { description: text }) },
            {
              onSuccess: () => {
                toast.success(t("safety.report.sent"));
                close();
              },
            },
          );
        }}
      >
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-2 text-muted">{t("safety.report.question")}</legend>
          {REPORT_REASONS.map((value) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-plum"
            >
              <input
                type="radio"
                name="reason"
                value={value}
                checked={reason === value}
                onChange={() => {
                  setReason(value);
                }}
                className="size-4 accent-lilac"
              />
              {t(`safety.report.reason.${value}`)}
            </label>
          ))}
        </fieldset>
        {reason === "OTHER" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={descriptionId} className="text-sm font-medium">
              {t("safety.report.description")}
            </label>
            <textarea
              id={descriptionId}
              value={description}
              maxLength={MAX_REPORT_DESCRIPTION}
              rows={3}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
              className="w-full resize-none rounded-xl border border-line bg-plum px-3.5 py-2.5 focus:border-lilac focus:outline-none"
            />
          </div>
        )}
        <FormError error={report.error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={!reason || needsDescription || report.isPending}>
            {t("safety.report.submit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
