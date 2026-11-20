import { MessageCircle, ShieldAlert, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useSession } from "~/api/session";
import { SafetyMenu } from "~/features/safety";
import { formatCount, formatDateTime, formatRelativeTime } from "~/shared/lib/format";
import { Avatar } from "~/shared/ui/avatar";

import type { Post } from "../api";
import { DeletePostButton } from "./delete-post-button";
import { LikeButton } from "./like-button";
import { PostMedia } from "./post-media";

interface PostCardProps {
  post: Post;
  /** On the post's own page the caption is not a link to it. */
  standalone?: boolean;
  onMediaExpired?: (() => void) | undefined;
  /** After the author deleted it, e.g. leave the post's own page. */
  onDeleted?: (() => void) | undefined;
}

export function PostCard({ post, standalone = false, onMediaExpired, onDeleted }: PostCardProps) {
  const { t, i18n } = useTranslation();
  const ownPost = useSession((state) => state.user?.userId === post.userId);
  const username = post.username ?? "";
  const postPath = `/p/${post.id ?? ""}`;
  const takenDown = post.moderationStatus === "TAKEN_DOWN";
  const media = post.media ?? [];

  const body = (
    <>
      {post.caption && (
        <p className="break-words whitespace-pre-line" data-caption-of={post.id}>
          {post.caption}
        </p>
      )}
      {media.length > 0 && <PostMedia media={media} author={username} onExpired={onMediaExpired} />}
    </>
  );

  return (
    <article
      className="flex gap-3 border-b border-line px-4 py-4"
      aria-labelledby={`post-${post.id ?? ""}-author`}
    >
      <Link to={`/u/${username}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
        <Avatar src={post.profileImageUrl} name={username} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <header className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <Link
            id={`post-${post.id ?? ""}-author`}
            to={`/u/${username}`}
            className="font-semibold hover:underline"
          >
            @{username}
          </Link>
          {post.createdAt && (
            <Link to={postPath} className="text-muted hover:underline">
              <time dateTime={post.createdAt} title={formatDateTime(post.createdAt, i18n.language)}>
                {formatRelativeTime(post.createdAt, i18n.language)}
              </time>
            </Link>
          )}
          {post.suggested && (
            <span className="inline-flex items-center gap-1 text-xs text-lilac">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {t("post.suggested")}
            </span>
          )}
        </header>

        {takenDown && (
          <p className="flex gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm">
            <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
            <span>
              {t("post.takenDown")}
              {post.takedownReason && ` ${t("post.takedownReason", { reason: post.takedownReason })}`}
            </span>
          </p>
        )}

        {standalone ? (
          <div className="flex flex-col gap-3">{body}</div>
        ) : (
          <Link to={postPath} className="flex flex-col gap-3" aria-label={t("post.open", { username })}>
            {body}
          </Link>
        )}

        <footer className="flex items-center gap-4 text-sm text-muted">
          <LikeButton post={post} />
          <Link
            to={standalone ? "#comments" : postPath}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-lilac/10 hover:text-lilac"
            aria-label={t("post.comments", { count: post.commentCount ?? 0 })}
          >
            <MessageCircle className="size-4.5" aria-hidden="true" />
            {formatCount(post.commentCount ?? 0, i18n.language)}
          </Link>
          {ownPost && post.id && <DeletePostButton postId={post.id} onDeleted={onDeleted} />}
          {!ownPost && post.id && post.userId && (
            <span className="ml-auto">
              <SafetyMenu target={{ type: "POST", id: post.id }} user={{ id: post.userId, username }} />
            </span>
          )}
        </footer>
      </div>
    </article>
  );
}
