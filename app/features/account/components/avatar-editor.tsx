import { Camera, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { errorMessage } from "~/shared/lib/error-message";
import { Alert } from "~/shared/ui/alert";
import { Avatar } from "~/shared/ui/avatar";
import { Button } from "~/shared/ui/button";

import {
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_TYPES,
  useRemoveProfileImage,
  useSetProfileImage,
  type Me,
} from "../api";

/** The profile picture: upload a new one (straight to storage, with progress) or remove it. */
export function AvatarEditor({ me }: { me: Me }) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const upload = useSetProfileImage();
  const remove = useRemoveProfileImage();
  const busy = upload.isPending || remove.isPending;

  const choose = (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
      setProblem(t("account.photo.type"));
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setProblem(t("account.photo.size"));
      return;
    }
    setProblem(null);
    setProgress(0);
    upload.mutate(
      { file, onProgress: setProgress },
      {
        onSuccess: () => toast.success(t("account.photo.saved")),
        onError: (error) => {
          setProblem(errorMessage(error, t));
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar src={me.profileImageUrl} name={me.username ?? ""} size="lg" />
          {upload.isPending && (
            <div
              role="progressbar"
              aria-label={t("account.photo.uploading")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              className="absolute inset-x-2 bottom-1 h-1.5 overflow-hidden rounded-full bg-ink/70"
            >
              <div className="h-full bg-lilac" style={{ width: `${progress * 100}%` }} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept={PROFILE_IMAGE_TYPES.join(",")}
            hidden
            onChange={(event) => {
              choose(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            <Camera className="size-4" aria-hidden="true" />
            {me.profileImageUrl ? t("account.photo.change") : t("account.photo.add")}
          </Button>
          {me.profileImageUrl && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                remove.mutate(undefined, {
                  onSuccess: () => toast.success(t("account.photo.removed")),
                  onError: (error) => toast.error(errorMessage(error, t)),
                });
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {t("account.photo.remove")}
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-muted">{t("account.photo.hint")}</p>
      {problem && <Alert>{problem}</Alert>}
    </div>
  );
}
