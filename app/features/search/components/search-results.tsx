import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { PostList, SEARCH_MIN_LENGTH, usePostSearch } from "~/features/posts";
import { UserRow, useUserSearch } from "~/features/users";
import { cn } from "~/shared/lib/cn";
import { LoadMore } from "~/shared/ui/load-more";
import { EmptyState, QueryState } from "~/shared/ui/query-state";

const TABS = ["top", "people", "posts"] as const;
type Tab = (typeof TABS)[number];
// the people shown above the posts on the top tab; the people tab lists them all
const TOP_PEOPLE = 3;

const isTab = (value: string | null): value is Tab => TABS.includes(value as Tab);

/**
 * What a search on home found: the top tab shows the best matching people above the matching posts, the other two
 * tabs one kind each. The tabs read the same two queries, so switching tabs asks the backend for nothing new.
 */
export function SearchResults({ term }: { term: string }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: Tab = isTab(tabParam) ? tabParam : "top";

  const show = (next: Tab) => {
    setSearchParams(
      (params) => {
        if (next === "top") {
          params.delete("tab");
        } else {
          params.set("tab", next);
        }
        return params;
      },
      { replace: true },
    );
  };

  if (term.length < SEARCH_MIN_LENGTH) {
    return <EmptyState title={t("search.hintTitle")}>{t("search.hint")}</EmptyState>;
  }

  return (
    <section aria-label={t("search.results")}>
      <div role="tablist" aria-label={t("search.tabs")} className="flex border-b border-line">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            className={cn(
              "flex-1 border-b-2 py-3 text-center font-semibold transition-colors",
              tab === name ? "border-lilac text-fg" : "border-transparent text-muted hover:text-fg",
            )}
            onClick={() => {
              show(name);
            }}
          >
            {t(`search.tab.${name}`)}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "top" && (
          <TopResults
            term={term}
            onAllPeople={() => {
              show("people");
            }}
          />
        )}
        {tab === "people" && <PeopleResults term={term} />}
        {tab === "posts" && <PostResults term={term} />}
      </div>
    </section>
  );
}

function TopResults({ term, onAllPeople }: { term: string; onAllPeople: () => void }) {
  const { t } = useTranslation();
  const people = useUserSearch(term);
  const posts = usePostSearch(term);

  const foundPeople = people.data?.pages.flatMap((page) => page.content ?? []);
  const foundPosts = posts.data?.pages.flatMap((page) => page.content ?? []);
  if (foundPeople?.length === 0 && foundPosts?.length === 0) {
    return <EmptyState title={t("search.noResults", { term })} />;
  }

  return (
    <>
      {foundPeople === undefined ? (
        <QueryState error={people.error} onRetry={() => void people.refetch()} />
      ) : (
        foundPeople.length > 0 && (
          <div className="border-b border-line">
            <h2 className="px-4 pt-4 pb-1 text-sm font-semibold text-muted">{t("search.tab.people")}</h2>
            <ul aria-label={t("search.people")}>
              {foundPeople.slice(0, TOP_PEOPLE).map((person) => (
                <UserRow
                  key={person.id}
                  username={person.username ?? ""}
                  name={person.fullName}
                  imageUrl={person.profileImageUrl}
                />
              ))}
            </ul>
            {(foundPeople.length > TOP_PEOPLE || people.hasNextPage) && (
              <button
                type="button"
                className="w-full px-4 py-3 text-left font-semibold text-lilac hover:bg-plum"
                onClick={onAllPeople}
              >
                {t("search.allPeople")}
              </button>
            )}
          </div>
        )
      )}
      {foundPosts?.length !== 0 && (
        <>
          <h2 className="px-4 pt-4 pb-1 text-sm font-semibold text-muted">{t("search.tab.posts")}</h2>
          <PostList query={posts} empty={{ title: t("search.noPosts", { term }) }} />
        </>
      )}
    </>
  );
}

function PeopleResults({ term }: { term: string }) {
  const { t } = useTranslation();
  const query = useUserSearch(term);

  if (!query.data) {
    return <QueryState error={query.error} onRetry={() => void query.refetch()} />;
  }
  const people = query.data.pages.flatMap((page) => page.content ?? []);
  if (people.length === 0) {
    return <EmptyState title={t("search.noPeople", { term })} />;
  }
  return (
    <>
      <ul aria-label={t("search.people")}>
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

function PostResults({ term }: { term: string }) {
  const { t } = useTranslation();
  const query = usePostSearch(term);
  return <PostList query={query} empty={{ title: t("search.noPosts", { term }) }} />;
}
