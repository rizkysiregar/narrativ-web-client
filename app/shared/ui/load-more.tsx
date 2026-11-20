import { useEffect, useEffectEvent, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "./button";
import { Spinner } from "./spinner";

interface LoadMoreProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

/**
 * The end of an infinite list: loads the next page when it scrolls into view, with a button for when that does not
 * happen (no IntersectionObserver, keyboard users).
 */
export function LoadMore({ hasMore, loading, onLoadMore }: LoadMoreProps) {
  const { t } = useTranslation();
  const sentinel = useRef<HTMLDivElement>(null);
  // the latest callback without restarting the observer whenever the parent renders
  const loadMore = useEffectEvent(onLoadMore);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !hasMore || typeof IntersectionObserver === "undefined") {
      return;
    }
    // start loading a little before the end is visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [hasMore]);

  if (!hasMore) {
    return null;
  }
  return (
    <div ref={sentinel} className="flex justify-center py-6">
      {loading ? (
        <Spinner label={t("list.loading")} />
      ) : (
        <Button variant="secondary" size="sm" onClick={onLoadMore}>
          {t("list.loadMore")}
        </Button>
      )}
    </div>
  );
}
