import { Quote, X } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { errorMessage } from "~/shared/lib/error-message";
import { Alert } from "~/shared/ui/alert";
import { Button } from "~/shared/ui/button";

import { MAX_COMMENT, useAddComment } from "../api";
import { useCaptionSelection } from "../use-caption-selection";

interface CommentComposerProps {
  postId: string;
  /** The comment answered; absent for a top-level comment. */
  replyTo?: { id: string; username: string } | undefined;
  onDone?: (() => void) | undefined;
  autoFocus?: boolean;
}

export function CommentComposer({ postId, replyTo, onDone, autoFocus = false }: CommentComposerProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [quote, setQuote] = useState<string | null>(null);
  // only top-level comments quote the caption
  const selection = useCaptionSelection(replyTo ? "" : postId);
  const id = useId();
  const add = useAddComment(postId);
  const text = content.trim();
  const tooLong = content.length > MAX_COMMENT;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate(
          { content: text, ...(replyTo && { parentId: replyTo.id }), ...(quote && { quoteText: quote }) },
          {
            onSuccess: () => {
              setContent("");
              setQuote(null);
              onDone?.();
            },
          },
        );
      }}
    >
      {quote && (
        <blockquote className="flex items-start gap-2 rounded-xl border-l-4 border-lilac bg-plum px-3 py-2 text-sm text-muted">
          <span className="min-w-0 flex-1 break-words">“{quote}”</span>
          <button
            type="button"
            aria-label={t("comments.removeQuote")}
            className="rounded-full p-0.5 hover:text-fg"
            onClick={() => {
              setQuote(null);
            }}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </blockquote>
      )}
      {!replyTo && selection && selection !== quote && (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-lilac hover:underline"
          // keep the selection: a mouse down elsewhere would clear it before the click
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => {
            setQuote(selection);
          }}
        >
          <Quote className="size-4" aria-hidden="true" />
          {t("comments.quoteSelection")}
        </button>
      )}
      <label htmlFor={id} className="sr-only">
        {replyTo ? t("comments.replyTo", { username: replyTo.username }) : t("comments.write")}
      </label>
      <textarea
        id={id}
        value={content}
        rows={2}
        autoFocus={autoFocus}
        placeholder={replyTo ? t("comments.replyTo", { username: replyTo.username }) : t("comments.write")}
        aria-invalid={tooLong || undefined}
        onChange={(event) => {
          setContent(event.target.value);
        }}
        className="w-full resize-none rounded-xl border border-line bg-plum px-3.5 py-2.5 placeholder:text-muted/70 focus:border-lilac focus:outline-none"
      />
      {add.error && <Alert>{errorMessage(add.error, t)}</Alert>}
      <div className="flex items-center justify-end gap-3">
        <span className={tooLong ? "text-sm text-danger" : "text-sm text-muted"}>
          {content.length}/{MAX_COMMENT}
        </span>
        {onDone && (
          <Button variant="ghost" size="sm" onClick={onDone}>
            {t("common.cancel")}
          </Button>
        )}
        <Button type="submit" size="sm" disabled={text === "" || tooLong || add.isPending}>
          {replyTo ? t("comments.sendReply") : t("comments.send")}
        </Button>
      </div>
    </form>
  );
}
