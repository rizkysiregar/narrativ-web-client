import { useTranslation } from "react-i18next";

import { PostList, useExploreFeed } from "~/features/posts";
import { APP_NAME } from "~/shared/config/env";
import { PageHeader } from "~/shared/ui/page-header";

import type { Route } from "./+types/explore";

export const meta: Route.MetaFunction = () => [{ title: `Explore · ${APP_NAME}` }];

export default function Explore() {
  const { t } = useTranslation();
  const feed = useExploreFeed();

  return (
    <>
      <PageHeader title={t("nav.explore")} />
      <PostList query={feed} empty={{ title: t("feed.exploreEmpty") }} />
    </>
  );
}
