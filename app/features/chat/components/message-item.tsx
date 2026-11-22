import type { Attachment, Message } from "@rizkysiregar/marpokat-core";
import { CornerUpLeft, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "~/shared/lib/cn";

const QUICK_REACTIONS = ["👍", "❤️", "😂"] as const;

interface MessageItemProps {
  message: Message;
  mine: boolean;
  /** Group chats show who wrote it. */
  showSender: boolean;
  frozen: boolean;
  onReact: (message: Message, emoji: string, on: boolean) => void;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
}

export function MessageItem({
  message,
  mine,
  showSender,
  frozen,
  onReact,
  onReply,
  onEdit,
  onDelete,
}: MessageItemProps) {
  const { t } = useTranslation();

  if (message.type === "system") {
    return <p className="self-center py-1 text-xs text-muted">{message.text}</p>;
  }
  if (message.deleted_at) {
    return (
      <p
        className={cn(
          "max-w-[80%] rounded-2xl border border-line px-3 py-2 text-sm text-muted italic",
          mine ? "self-end" : "self-start",
        )}
      >
        {t("chat.deleted")}
      </p>
    );
  }

  const reactions = Object.entries(message.reactions.counts);
  return (
    <div
      className={cn(
        "group flex max-w-[80%] flex-col gap-1",
        mine ? "items-end self-end" : "items-start self-start",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-1 rounded-2xl px-3 py-2",
          mine ? "bg-lilac text-ink" : "bg-plum text-fg",
        )}
      >
        {showSender && !mine && (
          <span className="text-xs font-semibold">{message.sender?.name ?? message.sender?.external_id}</span>
        )}
        {message.reply_to && (
          <blockquote className="border-l-2 border-current/40 pl-2 text-xs opacity-80">
            {message.reply_to.deleted
              ? t("chat.deleted")
              : (message.reply_to.text ?? t("chat.attachmentFile"))}
          </blockquote>
        )}
        {message.attachments?.map((attachment) => (
          <AttachmentView key={attachment.id} attachment={attachment} />
        ))}
        {message.text && <p className="break-words whitespace-pre-wrap">{message.text}</p>}
        {message.edited_at && <span className="text-xs opacity-70">{t("chat.edited")}</span>}
      </div>

      {reactions.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label={t("chat.reactions")}>
          {reactions.map(([emoji, count]) => {
            const on = message.reactions.mine.includes(emoji);
            return (
              <li key={emoji}>
                <button
                  type="button"
                  aria-pressed={on}
                  disabled={frozen}
                  onClick={() => {
                    onReact(message, emoji, !on);
                  }}
                  className={cn(
                    "rounded-full border px-2 text-xs",
                    on ? "border-lilac bg-plum-2 font-semibold" : "border-line bg-plum",
                  )}
                >
                  {emoji} {count}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!frozen && (
        <div className="flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={t("chat.react", { emoji })}
              className="rounded-full px-1.5 text-sm hover:bg-plum"
              onClick={() => {
                onReact(message, emoji, !message.reactions.mine.includes(emoji));
              }}
            >
              {emoji}
            </button>
          ))}
          <IconButton
            label={t("chat.reply")}
            onClick={() => {
              onReply(message);
            }}
            icon={CornerUpLeft}
          />
          {mine && message.text !== null && (
            <IconButton
              label={t("chat.edit")}
              onClick={() => {
                onEdit(message);
              }}
              icon={Pencil}
            />
          )}
          {mine && (
            <IconButton
              label={t("chat.delete")}
              onClick={() => {
                onDelete(message);
              }}
              icon={Trash2}
            />
          )}
        </div>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Pencil;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-full p-1.5 text-muted hover:bg-plum hover:text-fg"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

function AttachmentView({ attachment }: { attachment: Attachment }) {
  const { t } = useTranslation();
  if (attachment.status === "failed") {
    return <p className="text-sm italic">{t("chat.attachmentFailed")}</p>;
  }
  if (attachment.kind === "file") {
    return attachment.url ? (
      <a href={attachment.url} download={attachment.file_name ?? undefined} className="text-sm underline">
        {attachment.file_name ?? t("chat.attachmentFile")}
      </a>
    ) : (
      <span className="text-sm">{attachment.file_name ?? t("chat.attachmentFile")}</span>
    );
  }
  // the box keeps the room of the picture while its thumbnail is made, so the list does not jump
  const ratio = attachment.width && attachment.height ? attachment.width / attachment.height : 4 / 3;
  if (!attachment.url) {
    return (
      <div
        role="img"
        aria-label={t("chat.processing")}
        style={{ aspectRatio: ratio }}
        className="w-60 max-w-full animate-pulse rounded-lg bg-plum-2"
      />
    );
  }
  if (attachment.kind === "video") {
    return (
      <video
        controls
        preload="metadata"
        poster={attachment.thumbnail_url ?? undefined}
        src={attachment.url}
        className="max-h-80 max-w-full rounded-lg"
      />
    );
  }
  return (
    <a href={attachment.url} target="_blank" rel="noreferrer noopener">
      <img
        src={attachment.thumbnail_url ?? attachment.url}
        alt={t("chat.attachmentImage")}
        loading="lazy"
        style={{ aspectRatio: ratio }}
        className="max-h-80 max-w-full rounded-lg object-cover"
      />
    </a>
  );
}
