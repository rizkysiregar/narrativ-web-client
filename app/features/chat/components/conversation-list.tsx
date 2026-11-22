import { useChannels } from "@rizkysiregar/marpokat-react";
import type { ChannelState } from "@rizkysiregar/marpokat-core";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { cn } from "~/shared/lib/cn";
import { formatRelativeTime } from "~/shared/lib/format";
import { Avatar } from "~/shared/ui/avatar";
import { EmptyState } from "~/shared/ui/query-state";
import { Spinner } from "~/shared/ui/spinner";

import { useChatAvailable } from "../provider";
import { channelTitle, previewOf } from "../text";

export function ConversationList() {
  const available = useChatAvailable();
  const { t } = useTranslation();
  if (!available) {
    return <EmptyState title={t("chat.unavailableTitle")}>{t("chat.unavailable")}</EmptyState>;
  }
  return <Channels />;
}

function Channels() {
  const { t, i18n } = useTranslation();
  const { channels, online, loading } = useChannels();

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t("list.loading")} />
      </div>
    );
  }
  if (!channels.length) {
    return <EmptyState title={t("chat.emptyTitle")}>{t("chat.empty")}</EmptyState>;
  }
  return (
    <ul>
      {channels.map((channel) => (
        <li key={channel.id}>
          <Row
            channel={channel}
            online={Boolean(channel.dm_peer && online[channel.dm_peer.external_id])}
            language={i18n.language}
          />
        </li>
      ))}
    </ul>
  );
}

function Row({ channel, online, language }: { channel: ChannelState; online: boolean; language: string }) {
  const { t } = useTranslation();
  const unread = channel.membership.unread_count;
  const title = channelTitle(channel);
  const last = channel.last_message;
  return (
    <Link
      to={`/messages/${channel.id}`}
      className="flex items-center gap-3 border-b border-line px-4 py-3 hover:bg-plum"
    >
      <span className="relative">
        <Avatar src={channel.dm_peer?.avatar_url ?? channel.avatar_url ?? undefined} name={title} />
        {online && (
          <span
            role="img"
            aria-label={t("chat.online")}
            className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-ink bg-green-500"
          />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate", unread > 0 && "font-semibold")}>{title}</span>
          {channel.last_message_at && (
            <time className="shrink-0 text-xs text-muted" dateTime={channel.last_message_at}>
              {formatRelativeTime(channel.last_message_at, language)}
            </time>
          )}
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm", unread > 0 ? "text-fg" : "text-muted")}>
            {last ? previewOf(last, t) : t("chat.noMessages")}
          </span>
          {unread > 0 && (
            <span className="shrink-0 rounded-full bg-lilac px-2 text-xs font-semibold text-ink">
              <span className="sr-only">{t("nav.unread", { count: unread })}</span>
              <span aria-hidden="true">{unread > 99 ? "99+" : unread}</span>
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}
