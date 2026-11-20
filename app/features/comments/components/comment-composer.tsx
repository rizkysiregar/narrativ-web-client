import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { errorMessage } from "~/shared/lib/error-message";
import { Alert } from "~/shared/ui/alert";
import { Button } from "~/shared/ui/button";

import { MAX_COMMENT, useAddComment } from "../api";

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
          { content: text, ...(replyTo && { parentId: replyTo.id }) },
          {
            onSuccess: () => {
              setContent("");
              onDone?.();
            },
          },
        );
      }}
    >
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
