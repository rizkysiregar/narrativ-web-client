import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { ApiError } from "~/api/errors";
import { CommentSection } from "~/features/comments";
import { PostCard, usePost } from "~/features/posts";
import { APP_NAME } from "~/shared/config/env";
import { PageHeader } from "~/shared/ui/page-header";
import { PageMessage } from "~/shared/ui/page-message";
import { QueryState } from "~/shared/ui/query-state";

import type { Route } from "./+types/post";

export const meta: Route.MetaFunction = () => [{ title: `Post · ${APP_NAME}` }];

export default function PostPage({ params }: Route.ComponentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const post = usePost(params.postId);

  return (
    <>
      <PageHeader title={t("post.title")} back />
      {post.data ? (
        <>
          <PostCard
            post={post.data}
            standalone
            onMediaExpired={() => void post.refetch()}
            onDeleted={() => void navigate("/", { replace: true })}
          />
          <CommentSection post={post.data} />
        </>
      ) : post.error instanceof ApiError && (post.error.status === 404 || post.error.status === 400) ? (
        // deleted, its author gone or banned, or blocked either way: the backend answers the same 404 for all
        <PageMessage title={t("post.notFound")} body={t("post.notFoundBody")} />
      ) : (
        <QueryState error={post.error} onRetry={() => void post.refetch()} />
      )}
    </>
  );
}
