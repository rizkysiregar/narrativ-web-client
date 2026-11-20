import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { ApiError } from "~/api/errors";
import { useSession } from "~/api/session";
import { CommentSection } from "~/features/comments";
import { PostCard, usePost } from "~/features/posts";
import { postMeta, PublicPostPreview } from "~/features/share";
import { fetchPublicPost } from "~/features/share/public-api.server";
import { publicOrigin } from "~/server/config.server";
import { PageHeader } from "~/shared/ui/page-header";
import { PageMessage } from "~/shared/ui/page-message";
import { QueryState } from "~/shared/ui/query-state";

import type { ShellHandle } from "./shell";
import type { Route } from "./+types/post";

export const handle: ShellHandle = { publicPreview: true };

/**
 * On the server, for a shared link: the public version of the post, for the link preview tags (Open Graph) and for
 * a visitor without a session.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  return { post: await fetchPublicPost(request, params.postId), origin: publicOrigin(request) };
}

// navigating inside the app needs no preview data: the signed-in page loads the post itself
export function clientLoader() {
  return null;
}

export const meta: Route.MetaFunction = ({ loaderData, location }) =>
  postMeta(loaderData?.post ?? null, loaderData?.origin ?? "", location.pathname);

export default function PostPage({ params, loaderData }: Route.ComponentProps) {
  const signedIn = useSession((state) => state.status === "authenticated");

  return signedIn ? (
    <PostView postId={params.postId} />
  ) : (
    <PublicPostPreview post={loaderData?.post ?? null} />
  );
}

function PostView({ postId }: { postId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const post = usePost(postId);

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
