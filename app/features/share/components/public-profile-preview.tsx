import { useTranslation } from "react-i18next";

import type { Schemas } from "~/api/types";
import { API_BASE_PATH } from "~/shared/config/env";
import { formatCount } from "~/shared/lib/format";
import { nonBlank } from "~/shared/lib/text";
import { Avatar } from "~/shared/ui/avatar";
import { PageMessage } from "~/shared/ui/page-message";

import { JoinPrompt } from "./public-frame";

type PublicProfile = Schemas["PublicProfileResponse"];

/** A shared profile as a visitor without an account sees it. */
export function PublicProfilePreview({ profile }: { profile: PublicProfile | null }) {
  const { t, i18n } = useTranslation();

  if (!profile) {
    return <PageMessage title={t("profile.notFound")} body={t("profile.notFoundBody")} />;
  }
  const username = profile.username ?? "";

  return (
    <>
      <header className="flex flex-col items-center gap-3 border-b border-line px-4 py-10 text-center">
        <Avatar
          src={profile.avatarPath ? `${API_BASE_PATH}${profile.avatarPath}` : undefined}
          name={username}
          size="lg"
        />
        <h1 className="heading text-3xl">{nonBlank(profile.fullName) ?? `@${username}`}</h1>
        <p className="text-muted">@{username}</p>
        <p className="flex gap-5 text-sm">
          <span>
            <strong>{formatCount(profile.followerCount ?? 0, i18n.language)}</strong>{" "}
            <span className="text-muted">
              {t("profile.followers", { count: profile.followerCount ?? 0 })}
            </span>
          </span>
          <span>
            <strong>{formatCount(profile.followingCount ?? 0, i18n.language)}</strong>{" "}
            <span className="text-muted">{t("profile.following")}</span>
          </span>
        </p>
      </header>
      <JoinPrompt text={t("share.profilePrompt", { username })} />
    </>
  );
}
