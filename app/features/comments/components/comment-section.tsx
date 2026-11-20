import { useTranslation } from "react-i18next";

import { useSession } from "~/api/session";
import type { Post } from "~/features/posts";
import { formatCount } from "~/shared/lib/format";
import { LoadMore } from "~/shared/ui/load-more";
import { EmptyState, QueryState } from "~/shared/ui/query-state";

import { useComments } from "../api";
import { CommentComposer } from "./comment-composer";
import { CommentItem } from "./comment-item";

/** The comments under a post: a box to write one, then the comments, the pinned one first. */
export function CommentSection({ post }: { post: Post }) {
  const { t, i18n } = useTranslation();
  const postId = post.id ?? "";
  const postOwner = useSession((state) => state.user?.userId === post.userId);
  const query = useComments(postId);
  const comments = query.data?.pages.flatMap((page) => page.content ?? []) ?? [];

  return (
    <section id="comments" aria-labelledby="comments-title" className="scroll-mt-16">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-4">
        <h2 id="comments-title" className="heading text-lg">
          {t("comments.title")}{" "}
          <span className="text-muted">{formatCount(post.commentCount ?? 0, i18n.language)}</span>
        </h2>
        <CommentComposer postId={postId} />
      </div>
      {!query.data ? (
        <QueryState error={query.error} onRetry={() => void query.refetch()} />
      ) : comments.length === 0 ? (
        <EmptyState title={t("comments.empty")} />
      ) : (
        <>
          <ul>
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} postId={postId} postOwner={postOwner} />
            ))}
          </ul>
          <LoadMore
            hasMore={query.hasNextPage}
            loading={query.isFetchingNextPage}
            onLoadMore={() => void query.fetchNextPage()}
          />
        </>
      )}
    </section>
  );
}
