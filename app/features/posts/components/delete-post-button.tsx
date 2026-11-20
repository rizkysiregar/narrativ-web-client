import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { errorMessage } from "~/shared/lib/error-message";
import { ConfirmDialog } from "~/shared/ui/confirm-dialog";

import { useDeletePost } from "../api";

/** For the author: deletes the post after asking. */
export function DeletePostButton({
  postId,
  onDeleted,
}: {
  postId: string;
  onDeleted?: (() => void) | undefined;
}) {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);
  const remove = useDeletePost();

  return (
    <>
      <button
        type="button"
        aria-label={t("post.delete.action")}
        className="ml-auto inline-flex items-center rounded-full p-1.5 transition-colors hover:bg-danger/10 hover:text-danger"
        onClick={() => {
          setAsking(true);
        }}
      >
        <Trash2 className="size-4.5" aria-hidden="true" />
      </button>
      <ConfirmDialog
        open={asking}
        title={t("post.delete.title")}
        body={t("post.delete.body")}
        confirmLabel={t("post.delete.confirm")}
        busy={remove.isPending}
        onClose={() => {
          setAsking(false);
        }}
        onConfirm={() => {
          remove.mutate(postId, {
            onSuccess: () => {
              setAsking(false);
              toast.success(t("post.delete.done"));
              onDeleted?.();
            },
            onError: (error) => {
              toast.error(errorMessage(error, t));
            },
          });
        }}
      />
    </>
  );
}
