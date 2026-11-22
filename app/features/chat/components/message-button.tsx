import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { errorMessage } from "~/shared/lib/error-message";
import { Button } from "~/shared/ui/button";

import { useOpenDirectMessage } from "../api";
import { useChatAvailable } from "../provider";

/** On a profile: opens the direct message with that user (created on the first use). Hidden while chat is off. */
export function MessageButton({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const available = useChatAvailable();
  const navigate = useNavigate();
  const open = useOpenDirectMessage();

  if (!available) {
    return null;
  }
  return (
    <Button
      variant="secondary"
      disabled={open.isPending}
      onClick={() => {
        open.mutate(userId, {
          onSuccess: (channelId) => void navigate(`/messages/${channelId}`),
          onError: (error) => toast.error(errorMessage(error, t)),
        });
      }}
    >
      <MessageCircle className="size-4" aria-hidden="true" />
      {t("chat.message")}
    </Button>
  );
}
