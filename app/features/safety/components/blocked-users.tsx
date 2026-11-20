import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { errorMessage } from "~/shared/lib/error-message";
import { Avatar } from "~/shared/ui/avatar";
import { Button } from "~/shared/ui/button";
import { LoadMore } from "~/shared/ui/load-more";
import { EmptyState, QueryState } from "~/shared/ui/query-state";

import { useBlock, useBlockedUsers } from "../api";

export function BlockedUsers() {
  const { t } = useTranslation();
  const query = useBlockedUsers();
  const block = useBlock();

  if (!query.data) {
    return <QueryState error={query.error} onRetry={() => void query.refetch()} />;
  }
  const people = query.data.pages.flatMap((page) => page.content ?? []);
  if (people.length === 0) {
    return <EmptyState title={t("safety.blocked.empty")}>{t("safety.blocked.emptyBody")}</EmptyState>;
  }
  return (
    <>
      <ul>
        {people.map((person) => {
          const username = person.username ?? "";
          return (
            <li key={person.id} className="flex items-center gap-3 border-b border-line px-4 py-3">
              <Avatar src={person.profileImage} name={username} />
              <span className="min-w-0 flex-1 truncate font-semibold">@{username}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={block.isPending}
                aria-label={t("safety.blocked.unblockUser", { username })}
                onClick={() => {
                  block.mutate(
                    { userId: person.id ?? "", block: false },
                    {
                      onSuccess: () => toast.success(t("safety.blocked.unblocked", { username })),
                      onError: (error) => toast.error(errorMessage(error, t)),
                    },
                  );
                }}
              >
                {t("safety.blocked.unblock")}
              </Button>
            </li>
          );
        })}
      </ul>
      <LoadMore
        hasMore={query.hasNextPage}
        loading={query.isFetchingNextPage}
        onLoadMore={() => void query.fetchNextPage()}
      />
    </>
  );
}
