import type { Attachment, Message, PendingMessage } from "@rizkysiregar/marpokat-core";
import { useMessageActions, useSendMessage, useTyping } from "@rizkysiregar/marpokat-react";
import { Paperclip, Send, X } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { errorMessage } from "~/shared/lib/error-message";
import { Button } from "~/shared/ui/button";

interface ComposerProps {
  channelId: string;
  frozen: boolean;
  replyTo: Message | null;
  onCancelReply: () => void;
  editing: Message | null;
  onDoneEditing: () => void;
}

interface Upload {
  key: string;
  name: string;
  progress: number;
  attachment?: Attachment;
}

export function Composer({
  channelId,
  frozen,
  replyTo,
  onCancelReply,
  editing,
  onDoneEditing,
}: ComposerProps) {
  const { t } = useTranslation();
  const { send, upload } = useSendMessage(channelId);
  const { edit } = useMessageActions();
  const { onInput, stop } = useTyping(channelId);
  // the parent keys this component by the message being edited, so the box starts with that text
  const [text, setText] = useState(editing?.text ?? "");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const file = useRef<HTMLInputElement>(null);

  if (frozen) {
    return (
      <p className="border-t border-line px-4 py-4 text-center text-sm text-muted">{t("chat.frozen")}</p>
    );
  }

  const ready = uploads.filter((u) => u.attachment);
  const busy = uploads.some((u) => !u.attachment);
  const canSend = !busy && (text.trim().length > 0 || ready.length > 0);

  function submit(event?: SyntheticEvent) {
    event?.preventDefault();
    if (!canSend) {
      return;
    }
    if (editing) {
      const edited = text.trim();
      if (edited && edited !== editing.text) {
        edit(editing.id, edited).catch((error: unknown) => toast.error(errorMessage(error, t)));
      }
      setText("");
      onDoneEditing();
      return;
    }
    send({
      text: text.trim(),
      attachmentIds: ready.flatMap((u) => (u.attachment ? [u.attachment.id] : [])),
      replyToId: replyTo?.id ?? null,
    });
    stop();
    setText("");
    setUploads([]);
    onCancelReply();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  function pick(files: FileList | null) {
    for (const data of Array.from(files ?? [])) {
      const key = `${data.name}-${String(Date.now())}-${String(Math.random())}`;
      setUploads((all) => [...all, { key, name: data.name, progress: 0 }]);
      upload({
        data,
        mime: data.type || "application/octet-stream",
        name: data.name,
        onProgress: ({ loaded, total }) => {
          setUploads((all) =>
            all.map((u) => (u.key === key ? { ...u, progress: total ? loaded / total : 0 } : u)),
          );
        },
      })
        .then((attachment) => {
          setUploads((all) => all.map((u) => (u.key === key ? { ...u, attachment, progress: 1 } : u)));
        })
        .catch((error: unknown) => {
          setUploads((all) => all.filter((u) => u.key !== key));
          toast.error(errorMessage(error, t));
        });
    }
    if (file.current) {
      file.current.value = "";
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border-t border-line px-4 py-3">
      {(replyTo ?? editing) && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-plum px-3 py-1 text-sm">
          <span className="truncate text-muted">
            {editing
              ? t("chat.editing")
              : t("chat.replyingTo", { text: replyTo?.text ?? t("chat.attachmentFile") })}
          </span>
          <button
            type="button"
            aria-label={t("common.cancel")}
            onClick={
              editing
                ? () => {
                    setText("");
                    onDoneEditing();
                  }
                : onCancelReply
            }
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {uploads.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-xs">
          {uploads.map((u) => (
            <li key={u.key} className="flex items-center gap-1 rounded-full bg-plum px-2 py-1">
              <span className="max-w-32 truncate">{u.name}</span>
              <progress value={u.progress} max={1} aria-label={u.name} className="h-1 w-10" />
              <button
                type="button"
                aria-label={t("common.cancel")}
                onClick={() => {
                  setUploads((all) => all.filter((x) => x.key !== u.key));
                }}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        {!editing && (
          <>
            <input
              ref={file}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                pick(event.target.files);
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              aria-label={t("chat.attach")}
              onClick={() => file.current?.click()}
            >
              <Paperclip className="size-5" aria-hidden="true" />
            </Button>
          </>
        )}
        <textarea
          value={text}
          rows={1}
          maxLength={4000}
          aria-label={t("chat.message")}
          placeholder={t("chat.message")}
          className="max-h-40 min-h-10 flex-1 resize-none rounded-2xl border border-line bg-plum px-4 py-2 text-fg focus:outline-2 focus:outline-lilac"
          onChange={(event) => {
            setText(event.target.value);
            if (!editing) {
              onInput();
            }
          }}
          onKeyDown={onKeyDown}
        />
        <Button type="submit" size="md" disabled={!canSend} aria-label={t("chat.send")}>
          <Send className="size-5" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}

export function PendingItem({
  pending,
  onRetry,
  onDiscard,
}: {
  pending: PendingMessage;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const { t } = useTranslation();
  const failed = pending.status === "failed";
  return (
    <div className="flex max-w-[80%] flex-col items-end gap-1 self-end">
      <p className="rounded-2xl bg-lilac/60 px-3 py-2 break-words whitespace-pre-wrap text-ink">
        {pending.text || t("chat.attachmentFile")}
      </p>
      {failed ? (
        <span className="flex items-center gap-2 text-xs text-danger" role="alert">
          {pending.error?.message ?? t("chat.sendFailed")}
          <button type="button" className="underline" onClick={onRetry}>
            {t("list.retry")}
          </button>
          <button type="button" className="underline" onClick={onDiscard}>
            {t("chat.discard")}
          </button>
        </span>
      ) : (
        <span className="text-xs text-muted">{t("chat.sending")}</span>
      )}
    </div>
  );
}
