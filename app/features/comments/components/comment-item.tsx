import { Pin, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";

import { errorMessage } from "~/shared/lib/error-message";
import { formatDateTime, formatRelativeTime } from "~/shared/lib/format";
import { Avatar } from "~/shared/ui/avatar";
import { ConfirmDialog } from "~/shared/ui/confirm-dialog";
import { LoadMore } from "~/shared/ui/load-more";

import { useDeleteComment, usePinComment, useReplies, type Comment } from "../api";
import { CommentComposer } from "./comment-composer";

interface CommentItemProps {
  comment: Comment;
  postId: string;
  /** The signed-in user wrote the post: may pin top-level comments. */
  postOwner: boolean;
  /** Set for a reply: the top-level comment it is filed under. */
  isReply?: boolean;
}

export function CommentItem({ comment, postId, postOwner, isReply = false }: CommentItemProps) {
  const { t, i18n } = useTranslation();
  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = useDeleteComment(postId);
  const pin = usePinComment(postId);
  const id = comment.id ?? "";
  const username = comment.username ?? "";
  const takenDown = comment.moderationStatus === "TAKEN_DOWN";
  const replyCount = comment.replyCount ?? 0;

  const action = "rounded-full px-2 py-0.5 font-semibold hover:bg-plum hover:text-fg";

  return (
    <li className={isReply ? "flex gap-3 pt-3" : "flex gap-3 border-b border-line px-4 py-4"}>
      <Link to={`/u/${username}`} tabIndex={-1} aria-hidden="true" className="shrink-0">
        <Avatar src={comment.profileImageUrl} name={username} size="sm" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <Link to={`/u/${username}`} className="font-semibold hover:underline">
            @{username}
          </Link>
          {comment.createdAt && (
            <time
              className="text-muted"
              dateTime={comment.createdAt}
              title={formatDateTime(comment.createdAt, i18n.language)}
            >
              {formatRelativeTime(comment.createdAt, i18n.language)}
            </time>
          )}
          {comment.pinned && (
            <span className="inline-flex items-center gap-1 text-xs text-lilac">
              <Pin className="size-3.5" aria-hidden="true" />
              {t("comments.pinned")}
            </span>
          )}
        </p>
        {takenDown ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <ShieldAlert className="size-4" aria-hidden="true" />
            {t("comments.takenDown")}
          </p>
        ) : (
          <p className="break-words whitespace-pre-line">
            {isReply && comment.replyToUsername && (
              <Link to={`/u/${comment.replyToUsername}`} className="mr-1 text-lilac hover:underline">
                @{comment.replyToUsername}
              </Link>
            )}
            {comment.commentContent}
          </p>
        )}

        <div className="-ml-2 flex flex-wrap gap-1 text-sm text-muted">
          {!takenDown && (
            <button
              type="button"
              className={action}
              onClick={() => {
                setReplying((current) => !current);
              }}
            >
              {t("comments.reply")}
            </button>
          )}
          {postOwner && !isReply && !takenDown && (
            <button
              type="button"
              className={action}
              disabled={pin.isPending}
              onClick={() => {
                pin.mutate(comment.pinned ? null : id, {
                  onError: (error) => toast.error(errorMessage(error, t)),
                });
              }}
            >
              {comment.pinned ? t("comments.unpin") : t("comments.pin")}
            </button>
          )}
          {comment.canDelete && (
            <button
              type="button"
              className={`${action} hover:text-danger`}
              onClick={() => {
                setConfirmDelete(true);
              }}
            >
              {t("comments.delete")}
            </button>
          )}
        </div>

        {replying && (
          <div className="pt-2">
            <CommentComposer
              postId={postId}
              replyTo={{ id, username }}
              autoFocus
              onDone={() => {
                setReplying(false);
                setShowReplies(true);
              }}
            />
          </div>
        )}

        {!isReply && replyCount > 0 && (
          <button
            type="button"
            aria-expanded={showReplies}
            className="self-start text-sm font-semibold text-lilac hover:underline"
            onClick={() => {
              setShowReplies((current) => !current);
            }}
          >
            {showReplies ? t("comments.hideReplies") : t("comments.showReplies", { count: replyCount })}
          </button>
        )}
        {!isReply && showReplies && <Replies commentId={id} postId={postId} postOwner={postOwner} />}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t("comments.deleteTitle")}
        body={replyCount > 0 && !isReply ? t("comments.deleteWithReplies") : t("comments.deleteBody")}
        confirmLabel={t("comments.delete")}
        busy={remove.isPending}
        onClose={() => {
          setConfirmDelete(false);
        }}
        onConfirm={() => {
          remove.mutate(id, {
            onSuccess: () => {
              setConfirmDelete(false);
            },
            onError: (error) => toast.error(errorMessage(error, t)),
          });
        }}
      />
    </li>
  );
}

function Replies({
  commentId,
  postId,
  postOwner,
}: {
  commentId: string;
  postId: string;
  postOwner: boolean;
}) {
  const query = useReplies(commentId, true);
  const replies = query.data?.pages.flatMap((page) => page.content ?? []) ?? [];

  return (
    <>
      <ul>
        {replies.map((reply) => (
          <CommentItem key={reply.id} comment={reply} postId={postId} postOwner={postOwner} isReply />
        ))}
      </ul>
      <LoadMore
        hasMore={query.hasNextPage || query.isPending}
        loading={query.isPending || query.isFetchingNextPage}
        onLoadMore={() => void query.fetchNextPage()}
      />
    </>
  );
}
