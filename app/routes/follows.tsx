import { useTranslation } from "react-i18next";
import { useMatches } from "react-router";

import { FollowList, useUserByUsername } from "~/features/users";
import { APP_NAME } from "~/shared/config/env";
import { PageHeader } from "~/shared/ui/page-header";

import type { Route } from "./+types/follows";

export const meta: Route.MetaFunction = ({ params }) => [{ title: `@${params.username} · ${APP_NAME}` }];

/** Followers or following of a user; the route id says which. */
export default function Follows({ params }: Route.ComponentProps) {
  const { t } = useTranslation();
  const kind = useMatches().at(-1)?.id === "following" ? "following" : "followers";
  const user = useUserByUsername(params.username);

  return (
    <>
      <PageHeader
        title={
          kind === "followers"
            ? t("profile.followersOf", { username: params.username })
            : t("profile.followingOf", { username: params.username })
        }
        back
      />
      <FollowList userId={user.data?.id} kind={kind} />
    </>
  );
}
