import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { PostList, useHomeFeed } from "~/features/posts";
import { SearchBox, SearchResults } from "~/features/search";
import { APP_NAME } from "~/shared/config/env";
import { useDebouncedValue } from "~/shared/hooks/use-debounced-value";
import { PageHeader } from "~/shared/ui/page-header";

import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [{ title: APP_NAME }];

/** The feed, with the search field above it: while a term is typed, the search results take the feed's place. */
export default function Home() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const term = (searchParams.get("q") ?? "").trim();
  // one request for the whole word, not one per letter
  const debounced = useDebouncedValue(term);

  return (
    <>
      <PageHeader title={t("nav.home")}>
        <SearchBox />
      </PageHeader>
      {term ? <SearchResults term={debounced} /> : <HomeFeed />}
    </>
  );
}

function HomeFeed() {
  const { t } = useTranslation();
  const feed = useHomeFeed();
  return <PostList query={feed} empty={{ title: t("feed.homeEmpty"), body: t("feed.homeEmptyBody") }} />;
}
