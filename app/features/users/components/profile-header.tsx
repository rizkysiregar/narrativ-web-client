import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { formatCount } from "~/shared/lib/format";
import { nonBlank } from "~/shared/lib/text";
import { Avatar } from "~/shared/ui/avatar";

import { useFollowStatus, type PublicUser } from "../api";

export function ProfileHeader({ user }: { user: PublicUser }) {
  const { t, i18n } = useTranslation();
  const status = useFollowStatus(user.id);
  const username = user.username ?? "";
  const count = (value: number | undefined) =>
    value === undefined ? "–" : formatCount(value, i18n.language);

  return (
    <header className="flex flex-col items-center gap-4 border-b border-line px-4 py-8 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
      <Avatar src={user.profileImageUrl} name={username} size="lg" />
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="heading truncate text-3xl">{nonBlank(user.fullName) ?? `@${username}`}</h1>
        <p className="text-muted">@{username}</p>
        <nav
          aria-label={t("profile.connections")}
          className="mt-2 flex justify-center gap-5 text-sm sm:justify-start"
        >
          <Link to={`/u/${username}/followers`} className="hover:underline">
            <strong className="font-semibold">{count(status.data?.followerCount)}</strong>{" "}
            <span className="text-muted">
              {t("profile.followers", { count: status.data?.followerCount ?? 0 })}
            </span>
          </Link>
          <Link to={`/u/${username}/following`} className="hover:underline">
            <strong className="font-semibold">{count(status.data?.followingCount)}</strong>{" "}
            <span className="text-muted">{t("profile.following")}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
