import { useMutation } from "@tanstack/react-query";
import { ImagePlus, Play, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSession } from "~/api/session";
import { errorMessage } from "~/shared/lib/error-message";
import { Alert } from "~/shared/ui/alert";
import { Avatar } from "~/shared/ui/avatar";
import { Button } from "~/shared/ui/button";

import { useCreatePost } from "../api";
import { ACCEPT, MAX_CAPTION, MAX_MEDIA, mediaProblem } from "../media-rules";
import { uploadPostMedia } from "../upload";

interface Item {
  id: string;
  file: File;
  previewUrl: string;
  /** 0..1 while uploading */
  progress: number;
  /** Set once uploaded: a retry after a failure does not upload this file again. */
  objectKey?: string;
}

let nextId = 0;

/**
 * Writes a post: a caption, up to five photos and videos, or both. Files go straight to object storage (with
 * progress); the post is created once they all arrived. Closing cancels uploads still running.
 */
export function Composer({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const username = useSession((state) => state.user?.username ?? "");
  const [caption, setCaption] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const captionId = useId();
  const createPost = useCreatePost();

  // the previews' object URLs and running uploads end with the composer
  const latestItems = useRef(items);
  useEffect(() => {
    latestItems.current = items;
  }, [items]);
  useEffect(
    () => () => {
      abort.current?.abort();
      for (const item of latestItems.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    },
    [],
  );

  const publish = useMutation({
    mutationFn: async () => {
      const controller = new AbortController();
      abort.current = controller;
      const keys = await Promise.all(
        items.map(async (item) => {
          if (item.objectKey) {
            return item.objectKey;
          }
          const key = await uploadPostMedia(
            item.file,
            (progress) => {
              setItems((current) => current.map((it) => (it.id === item.id ? { ...it, progress } : it)));
            },
            controller.signal,
          );
          setItems((current) => current.map((it) => (it.id === item.id ? { ...it, objectKey: key } : it)));
          return key;
        }),
      );
      const text = caption.trim();
      await createPost.mutateAsync({ ...(text && { caption: text }), mediaKeys: keys });
    },
    onSuccess: () => {
      toast.success(t("composer.published"));
      onDone();
    },
  });

  const addFiles = (files: FileList | null) => {
    if (!files) {
      return;
    }
    const room = MAX_MEDIA - items.length;
    const chosen = [...files];
    const refused = chosen.map(mediaProblem).find((found) => found !== null);
    const accepted = chosen.filter((file) => mediaProblem(file) === null).slice(0, Math.max(0, room));
    setProblem(
      refused
        ? t(`composer.problem.${refused}`)
        : chosen.length > room
          ? t("composer.problem.tooMany", { max: MAX_MEDIA })
          : null,
    );
    setItems((current) => [
      ...current,
      ...accepted.map((file) => ({
        id: String(nextId++),
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
      })),
    ]);
  };

  const remove = (id: string) => {
    setItems((current) => {
      const item = current.find((it) => it.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return current.filter((it) => it.id !== id);
    });
  };

  const tooLong = caption.length > MAX_CAPTION;
  const empty = caption.trim() === "" && items.length === 0;
  const busy = publish.isPending;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        publish.mutate();
      }}
    >
      <div className="flex gap-3">
        <Avatar name={username} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={captionId} className="sr-only">
            {t("composer.caption")}
          </label>
          <textarea
            id={captionId}
            value={caption}
            onChange={(event) => {
              setCaption(event.target.value);
            }}
            placeholder={t("composer.placeholder")}
            rows={4}
            autoFocus
            disabled={busy}
            aria-invalid={tooLong || undefined}
            className="w-full resize-none bg-transparent text-lg placeholder:text-muted/70 focus:outline-none"
          />
          <p
            className={tooLong ? "self-end text-sm text-danger" : "self-end text-sm text-muted"}
            aria-live="polite"
          >
            {caption.length}/{MAX_CAPTION}
          </p>
        </div>
      </div>

      {items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2" aria-label={t("composer.media")}>
          {items.map((item, index) => {
            const video = item.file.type.startsWith("video/");
            return (
              <li key={item.id} className="relative aspect-square overflow-hidden rounded-xl bg-plum">
                {video ? (
                  <video src={item.previewUrl} muted className="size-full object-cover" />
                ) : (
                  <img src={item.previewUrl} alt="" className="size-full object-cover" />
                )}
                {video && (
                  <Play
                    className="absolute top-2 left-2 size-4 fill-fg text-fg drop-shadow"
                    aria-hidden="true"
                  />
                )}
                {busy && !item.objectKey && (
                  <div
                    role="progressbar"
                    aria-label={t("composer.uploading", { index: index + 1 })}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(item.progress * 100)}
                    className="absolute inset-x-2 bottom-2 h-1.5 overflow-hidden rounded-full bg-ink/70"
                  >
                    <div
                      className="h-full bg-lilac transition-[width]"
                      style={{ width: `${item.progress * 100}%` }}
                    />
                  </div>
                )}
                {!busy && (
                  <button
                    type="button"
                    aria-label={t("composer.remove", { index: index + 1 })}
                    className="absolute top-1.5 right-1.5 rounded-full bg-ink/80 p-1 text-fg hover:bg-ink"
                    onClick={() => {
                      remove(item.id);
                    }}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {problem && <Alert>{problem}</Alert>}
      {publish.error && !(publish.error instanceof DOMException) && (
        <Alert>{errorMessage(publish.error, t)}</Alert>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          disabled={busy || items.length >= MAX_MEDIA}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus className="size-5" aria-hidden="true" />
          {t("composer.addMedia", { count: items.length, max: MAX_MEDIA })}
        </Button>
        <Button type="submit" disabled={busy || empty || tooLong}>
          {busy ? t("composer.publishing") : t("composer.publish")}
        </Button>
      </div>
    </form>
  );
}
