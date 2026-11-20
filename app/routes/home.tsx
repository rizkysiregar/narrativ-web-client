import { useTranslation } from "react-i18next";

import { PostList, useHomeFeed } from "~/features/posts";
import { APP_NAME } from "~/shared/config/env";
import { PageHeader } from "~/shared/ui/page-header";

import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [{ title: APP_NAME }];

export default function Home() {
  const { t } = useTranslation();
  const feed = useHomeFeed();

  return (
    <>
      <PageHeader title={t("nav.home")} />
      <PostList query={feed} empty={{ title: t("feed.homeEmpty"), body: t("feed.homeEmptyBody") }} />
    </>
  );
}
