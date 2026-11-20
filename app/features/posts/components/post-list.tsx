import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";

import type { Schemas } from "~/api/types";
import { useThrottledCallback } from "~/shared/hooks/use-throttled-callback";
import { LoadMore } from "~/shared/ui/load-more";
import { EmptyState, QueryState } from "~/shared/ui/query-state";

import { PostCard } from "./post-card";

type FeedQuery = UseInfiniteQueryResult<InfiniteData<Schemas["PaginatedResponsePostFeedResponse"]>>;

/** A paged feed of post cards with its loading, error, empty and load-more states. */
export function PostList({ query, empty }: { query: FeedQuery; empty: { title: string; body?: ReactNode } }) {
  // expired media URLs: fetch the pages again, at most once a minute however many images fail together
  const refreshMedia = useThrottledCallback(() => void query.refetch(), 60_000);

  if (!query.data) {
    return <QueryState error={query.error} onRetry={() => void query.refetch()} />;
  }
  const posts = query.data.pages.flatMap((page) => page.content ?? []);
  if (posts.length === 0) {
    return <EmptyState title={empty.title}>{empty.body}</EmptyState>;
  }
  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onMediaExpired={refreshMedia} />
      ))}
      <LoadMore
        hasMore={query.hasNextPage}
        loading={query.isFetchingNextPage}
        onLoadMore={() => void query.fetchNextPage()}
      />
    </div>
  );
}
