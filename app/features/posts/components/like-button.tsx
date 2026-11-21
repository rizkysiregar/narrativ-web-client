import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "~/shared/lib/cn";
import { formatCount } from "~/shared/lib/format";

import { useLikePost, type Post } from "../api";

export function LikeButton({ post }: { post: Post }) {
  const { t, i18n } = useTranslation();
  const like = useLikePost();
  const liked = post.liked ?? false;
  const count = post.likeCount ?? 0;

  return (
    <button
      type="button"
      // one name, the state in aria-pressed: a toggle that renames itself announces the wrong thing
      aria-pressed={liked}
      className={cn(
        "-ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-blush/10 hover:text-blush",
        liked && "text-blush",
      )}
      onClick={() => {
        if (post.id) {
          like.mutate({ postId: post.id, liked: !liked });
        }
      }}
    >
      <Heart className={cn("size-4.5", liked && "fill-blush")} aria-hidden="true" />
      {/* the short form (1.2K) for the eye, the exact count for screen readers */}
      <span aria-hidden="true">{formatCount(count, i18n.language)}</span>
      <span className="sr-only">{`${t("post.like")}, ${t("post.likes", { count })}`}</span>
    </button>
  );
}
