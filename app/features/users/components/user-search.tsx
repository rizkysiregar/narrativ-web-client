import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { useDebouncedValue } from "~/shared/hooks/use-debounced-value";
import { Input } from "~/shared/ui/input";
import { LoadMore } from "~/shared/ui/load-more";
import { EmptyState, QueryState } from "~/shared/ui/query-state";

import { useUserSearch } from "../api";
import { UserRow } from "./user-row";

/** Search people by username. The term lives in ?q=, so a search can be shared and survives a reload. */
export function UserSearch() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const term = searchParams.get("q") ?? "";
  const debounced = useDebouncedValue(term.trim());
  const query = useUserSearch(debounced);

  return (
    <div>
      <div className="sticky top-0 z-[5] border-b border-line bg-ink/90 px-4 py-3 backdrop-blur">
        <label className="relative block">
          <span className="sr-only">{t("search.label")}</span>
          <Search
            className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={term}
            placeholder={t("search.placeholder")}
            autoFocus
            autoCapitalize="none"
            className="pl-11"
            onChange={(event) => {
              const next = event.target.value;
              setSearchParams(next ? { q: next } : {}, { replace: true });
            }}
          />
        </label>
      </div>
      <SearchResults term={debounced} query={query} />
    </div>
  );
}

function SearchResults({ term, query }: { term: string; query: ReturnType<typeof useUserSearch> }) {
  const { t } = useTranslation();

  if (!term) {
    return <EmptyState title={t("search.hintTitle")}>{t("search.hint")}</EmptyState>;
  }
  if (!query.data) {
    return <QueryState error={query.error} onRetry={() => void query.refetch()} />;
  }
  const people = query.data.pages.flatMap((page) => page.content ?? []);
  if (people.length === 0) {
    return <EmptyState title={t("search.noResults", { term })} />;
  }
  return (
    <>
      <ul aria-label={t("search.results")}>
        {people.map((person) => (
          <UserRow
            key={person.id}
            username={person.username ?? ""}
            name={person.fullName}
            imageUrl={person.profileImageUrl}
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
