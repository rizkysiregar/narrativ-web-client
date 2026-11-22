import type { Channel, Message } from "@rizkysiregar/marpokat-core";
import type { TFunction } from "i18next";

import { nonBlank } from "~/shared/lib/text";

/** The name of a conversation: the other person for a DM, the group's name otherwise. */
export function channelTitle(channel: Channel): string {
  return (
    nonBlank(channel.name ?? undefined) ??
    nonBlank(channel.dm_peer?.name) ??
    nonBlank(channel.dm_peer?.external_id) ??
    "…"
  );
}

/** One line for the conversation list: the text, or what the message carries. */
export function previewOf(message: Message, t: TFunction): string {
  if (message.deleted_at) {
    return t("chat.deleted");
  }
  if (message.type === "system") {
    return message.text ?? "";
  }
  if (message.text) {
    return message.text;
  }
  const first = message.attachments?.[0];
  switch (first?.kind) {
    case "image":
      return t("chat.attachmentImage");
    case "video":
      return t("chat.attachmentVideo");
    case "file":
      return first.file_name ?? t("chat.attachmentFile");
    default:
      return "";
  }
}
