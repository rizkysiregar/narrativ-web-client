import { useTranslation } from "react-i18next";

import { LoadMore } from "~/shared/ui/load-more";
import { EmptyState, QueryState } from "~/shared/ui/query-state";

import { useFollows, type FollowKind } from "../api";
import { UserRow } from "./user-row";

export function FollowList({ userId, kind }: { userId: string | undefined; kind: FollowKind }) {
  const { t } = useTranslation();
  const query = useFollows(userId, kind);

  if (!query.data) {
    return <QueryState error={query.error} onRetry={() => void query.refetch()} />;
  }
  const people = query.data.pages.flatMap((page) => page.content ?? []);
  if (people.length === 0) {
    return <EmptyState title={kind === "followers" ? t("profile.noFollowers") : t("profile.noFollowing")} />;
  }
  return (
    <>
      <ul>
        {people.map((person) => (
          <UserRow
            key={person.id}
            username={person.username ?? ""}
            name={[person.firstName, person.lastName].filter(Boolean).join(" ")}
            imageUrl={person.profileImage}
          />
        ))}
      </ul>
      <LoadMore
        hasMore={query.hasNextPage}
        loading={query.isFetchingNextPage}
        onLoadMore={() => void query.fetchNextPage()}
      />
    </>
  );
}
