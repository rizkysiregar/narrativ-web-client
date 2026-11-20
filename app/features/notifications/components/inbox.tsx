import { CheckCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { cn } from "~/shared/lib/cn";
import { formatDateTime, formatRelativeTime } from "~/shared/lib/format";
import { Avatar } from "~/shared/ui/avatar";
import { Button } from "~/shared/ui/button";
import { LoadMore } from "~/shared/ui/load-more";
import { PageHeader } from "~/shared/ui/page-header";
import { EmptyState, QueryState } from "~/shared/ui/query-state";

import { useInbox, useMarkAllRead, useMarkRead, type Notification } from "../api";

export function Inbox() {
  const { t } = useTranslation();
  const query = useInbox();
  const markAll = useMarkAllRead();
  const entries = query.data?.pages.flatMap((page) => page.content ?? []) ?? [];
  const anyUnread = entries.some((entry) => entry.unread);

  return (
    <>
      <PageHeader title={t("nav.notifications")}>
        {anyUnread && (
          <div className="flex justify-end px-4 pb-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={markAll.isPending}
              onClick={() => {
                markAll.mutate();
              }}
            >
              <CheckCheck className="size-4" aria-hidden="true" />
              {t("notifications.markAll")}
            </Button>
          </div>
        )}
      </PageHeader>
      {!query.data ? (
        <QueryState error={query.error} onRetry={() => void query.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState title={t("notifications.empty")}>{t("notifications.emptyBody")}</EmptyState>
      ) : (
        <>
          <ul>
            {entries.map((entry) => (
              <InboxEntry key={entry.groupKey} entry={entry} />
            ))}
          </ul>
          <LoadMore
            hasMore={query.hasNextPage}
            loading={query.isFetchingNextPage}
            onLoadMore={() => void query.fetchNextPage()}
          />
        </>
      )}
    </>
  );
}

/** Where an entry leads: the follower's profile, or the post (its comments for comment events). */
function destination(entry: Notification): string {
  const [actor] = entry.actors ?? [];
  if (entry.type === "FOLLOWED") {
    return `/u/${actor?.username ?? ""}`;
  }
  const comments =
    entry.type === "POST_COMMENTED" || entry.type === "COMMENT_REPLIED" || entry.type === "COMMENT_PINNED";
  return `/p/${entry.postId ?? ""}${comments ? "#comments" : ""}`;
}

function InboxEntry({ entry }: { entry: Notification }) {
  const { t, i18n } = useTranslation();
  const markRead = useMarkRead();
  const actors = entry.actors ?? [];
  const actor = actors[0]?.username ?? "";
  const others = Math.max(0, (entry.actorCount ?? actors.length) - 1);
  const type = entry.type ?? "POST_LIKED";

  return (
    <li>
      <Link
        to={destination(entry)}
        className={cn(
          "flex gap-3 border-b border-line px-4 py-4 transition-colors hover:bg-plum",
          entry.unread && "bg-plum/60",
        )}
        onClick={() => {
          if (entry.unread && entry.groupKey) {
            markRead.mutate(entry.groupKey);
          }
        }}
      >
        <span className="flex -space-x-3">
          {actors.slice(0, 3).map((person) => (
            <Avatar
              key={person.id}
              src={person.profileImageUrl}
              name={person.username ?? ""}
              size="sm"
              className="ring-2 ring-ink"
            />
          ))}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span>
            {others > 0
              ? t(`notifications.type.${type}_many`, { actor: `@${actor}`, count: others })
              : t(`notifications.type.${type}`, { actor: `@${actor}` })}
          </span>
          {entry.preview && <span className="line-clamp-2 text-sm text-muted">“{entry.preview}”</span>}
          {entry.createdAt && (
            <time
              className="text-xs text-muted"
              dateTime={entry.createdAt}
              title={formatDateTime(entry.createdAt, i18n.language)}
            >
              {formatRelativeTime(entry.createdAt, i18n.language)}
            </time>
          )}
        </span>
        {entry.postThumbnailUrl && (
          <img
            src={entry.postThumbnailUrl}
            alt=""
            loading="lazy"
            className="size-12 shrink-0 rounded-lg object-cover"
          />
        )}
        {entry.unread && (
          <span
            className="mt-2 size-2 shrink-0 rounded-full bg-lilac"
            aria-label={t("notifications.unread")}
          />
        )}
      </Link>
    </li>
  );
}
