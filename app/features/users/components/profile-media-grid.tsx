import { Layers, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useUserPosts } from "~/features/posts";
import { LoadMore } from "~/shared/ui/load-more";
import { EmptyState, QueryState } from "~/shared/ui/query-state";

/** The user's photos and videos as square tiles, newest first; a tile opens its post. */
export function ProfileMediaGrid({ username }: { username: string }) {
  const { t } = useTranslation();
  const query = useUserPosts(username, true);

  if (!query.data) {
    return <QueryState error={query.error} onRetry={() => void query.refetch()} />;
  }
  const posts = query.data.pages.flatMap((page) => page.content ?? []).filter((post) => post.media?.length);
  if (posts.length === 0) {
    return <EmptyState title={t("profile.noMedia")} />;
  }
  return (
    <div>
      <ul className="grid grid-cols-3 gap-0.5">
        {posts.map((post) => {
          const [first] = post.media ?? [];
          const video = first?.type === "VIDEO";
          const src = video ? first.thumbnailUrl : first?.url;
          return (
            <li key={post.id} className="relative aspect-square bg-plum">
              <Link to={`/p/${post.id ?? ""}`} aria-label={t("profile.openPost")}>
                {src && <img src={src} alt="" loading="lazy" className="size-full object-cover" />}
                <span className="absolute top-2 right-2 text-fg drop-shadow" aria-hidden="true">
                  {video ? (
                    <Play className="size-4 fill-fg" />
                  ) : (
                    (post.media?.length ?? 0) > 1 && <Layers className="size-4" />
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <LoadMore
        hasMore={query.hasNextPage}
        loading={query.isFetchingNextPage}
        onLoadMore={() => void query.fetchNextPage()}
      />
    </div>
  );
}
