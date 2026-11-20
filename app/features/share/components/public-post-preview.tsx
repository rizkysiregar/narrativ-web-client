import { Heart, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Schemas } from "~/api/types";
import { API_BASE_PATH } from "~/shared/config/env";
import { nonBlank } from "~/shared/lib/text";
import { formatCount, formatDateTime, formatRelativeTime } from "~/shared/lib/format";
import { Avatar } from "~/shared/ui/avatar";
import { PageMessage } from "~/shared/ui/page-message";

import { JoinPrompt } from "./public-frame";

type PublicPost = Schemas["PublicPostResponse"];

// image paths of the public API are relative to the API base; same-origin, they redirect to the file
const image = (path: string | undefined) => (path ? `${API_BASE_PATH}${path}` : undefined);

/** A shared post as a visitor without an account sees it: the post itself, and the way in to do more. */
export function PublicPostPreview({ post }: { post: PublicPost | null }) {
  const { t, i18n } = useTranslation();

  if (!post) {
    return <PageMessage title={t("post.notFound")} body={t("post.notFoundBody")} />;
  }
  const username = post.author?.username ?? "";
  const media = (post.media ?? []).filter((item) => item.imagePath);

  return (
    <>
      <article className="flex flex-col gap-3 border-b border-line px-4 py-5">
        <header className="flex items-center gap-3">
          <Avatar src={image(post.author?.avatarPath)} name={username} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">
              {nonBlank(post.author?.fullName) ?? `@${username}`}
            </span>
            <span className="text-sm text-muted">
              @{username}
              {post.createdAt && (
                <>
                  {" · "}
                  <time dateTime={post.createdAt} title={formatDateTime(post.createdAt, i18n.language)}>
                    {formatRelativeTime(post.createdAt, i18n.language)}
                  </time>
                </>
              )}
            </span>
          </div>
        </header>
        {post.caption && <p className="text-lg break-words whitespace-pre-line">{post.caption}</p>}
        {media.length > 0 && (
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-2xl">
            {media.map((item, index) => (
              <img
                key={item.id}
                src={image(item.imagePath)}
                alt={t("post.media.item", { index: index + 1, count: media.length, author: username })}
                className="aspect-[4/5] w-full shrink-0 snap-center rounded-2xl border border-line object-cover"
              />
            ))}
          </div>
        )}
        <footer className="flex gap-5 text-sm text-muted">
          <span
            className="inline-flex items-center gap-1.5"
            aria-label={t("post.likes", { count: post.likeCount ?? 0 })}
          >
            <Heart className="size-4.5" aria-hidden="true" />
            {formatCount(post.likeCount ?? 0, i18n.language)}
          </span>
          <span
            className="inline-flex items-center gap-1.5"
            aria-label={t("post.comments", { count: post.commentCount ?? 0 })}
          >
            <MessageCircle className="size-4.5" aria-hidden="true" />
            {formatCount(post.commentCount ?? 0, i18n.language)}
          </span>
        </footer>
      </article>
      <JoinPrompt text={t("share.postPrompt", { username })} />
    </>
  );
}
