import {
  useChannel,
  useClient,
  useMessageActions,
  useMessages,
  useSendMessage,
  useTyping,
} from "@rizkysiregar/marpokat-react";
import type { Message } from "@rizkysiregar/marpokat-core";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { errorMessage } from "~/shared/lib/error-message";
import { Button } from "~/shared/ui/button";
import { PageHeader } from "~/shared/ui/page-header";
import { ConfirmDialog } from "~/shared/ui/confirm-dialog";
import { EmptyState } from "~/shared/ui/query-state";
import { Spinner } from "~/shared/ui/spinner";

import { useChatAvailable } from "../provider";
import { Composer, PendingItem } from "./composer";
import { channelTitle } from "../text";
import { MessageItem } from "./message-item";

export function Conversation({ channelId }: { channelId: string }) {
  const available = useChatAvailable();
  const { t } = useTranslation();
  if (!available) {
    return <EmptyState title={t("chat.unavailableTitle")}>{t("chat.unavailable")}</EmptyState>;
  }
  return <Thread channelId={channelId} />;
}

function Thread({ channelId }: { channelId: string }) {
  const { t } = useTranslation();
  const client = useClient();
  const me = client.getSnapshot().me?.external_id;
  const { channel, loading } = useChannel(channelId);
  const { messages, pending, hasOlder, loadOlder } = useMessages(channelId);
  const { retry, discard } = useSendMessage(channelId);
  const { react, remove } = useMessageActions();
  const { typing } = useTyping(channelId);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState<Message | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const stuck = useRef(true);
  const list = useRef<HTMLDivElement>(null);

  // follow the newest message, unless the reader scrolled up to read something older
  const newest = messages.at(-1)?.rev_seq;
  useEffect(() => {
    const el = list.current;
    if (stuck.current && el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [newest, pending.length, typing.length]);

  if (!channel && loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t("list.loading")} />
      </div>
    );
  }
  if (!channel) {
    return <EmptyState title={t("chat.notFoundTitle")}>{t("chat.notFound")}</EmptyState>;
  }

  const group = channel.type === "group";
  const names = typing
    .map((id) => (channel.dm_peer?.external_id === id ? channel.dm_peer.name : id))
    .join(", ");

  async function older() {
    setLoadingOlder(true);
    const el = list.current;
    const before = el?.scrollHeight ?? 0;
    try {
      await loadOlder();
    } finally {
      setLoadingOlder(false);
      // keep what the reader was looking at in place
      requestAnimationFrame(() => {
        if (el) {
          el.scrollTop += el.scrollHeight - before;
        }
      });
    }
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col md:h-dvh">
      <PageHeader title={channelTitle(channel)} back />
      <div
        ref={list}
        className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4"
        onScroll={(event) => {
          const el = event.currentTarget;
          stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {hasOlder && (
          <Button
            variant="ghost"
            size="sm"
            className="self-center"
            disabled={loadingOlder}
            onClick={() => void older()}
          >
            {t("chat.loadEarlier")}
          </Button>
        )}
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            mine={message.sender?.external_id === me}
            showSender={group}
            frozen={channel.frozen}
            onReact={(m, emoji, on) =>
              void react(m.id, emoji, on).catch((error: unknown) => toast.error(errorMessage(error, t)))
            }
            onReply={(m) => {
              setEditing(null);
              setReplyTo(m);
            }}
            onEdit={(m) => {
              setReplyTo(null);
              setEditing(m);
            }}
            onDelete={setDeleting}
          />
        ))}
        {pending.map((p) => (
          <PendingItem
            key={p.clientMsgId}
            pending={p}
            onRetry={() => {
              retry(p.clientMsgId);
            }}
            onDiscard={() => {
              discard(p.clientMsgId);
            }}
          />
        ))}
        <div aria-live="polite" className="min-h-5 text-xs text-muted">
          {typing.length > 0 && t("chat.typing", { names })}
        </div>
      </div>
      <Composer
        key={editing?.id ?? "new"}
        channelId={channelId}
        frozen={channel.frozen}
        replyTo={replyTo}
        onCancelReply={() => {
          setReplyTo(null);
        }}
        editing={editing}
        onDoneEditing={() => {
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={t("chat.deleteTitle")}
        body={t("chat.deleteBody")}
        confirmLabel={t("chat.delete")}
        onClose={() => {
          setDeleting(null);
        }}
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (target) {
            void remove(target.id).catch((error: unknown) => toast.error(errorMessage(error, t)));
          }
        }}
      />
    </div>
  );
}
