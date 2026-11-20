import { useState, type UIEvent } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "~/shared/lib/cn";

import type { PostMedia as Media } from "../api";

interface PostMediaProps {
  media: Media[];
  author: string;
  /** A media URL failed to load: presigned URLs expire after an hour, so the post should be fetched again. */
  onExpired?: (() => void) | undefined;
}

/** One photo or video, or several side by side with scroll snapping and a position indicator. */
export function PostMedia({ media, author, onExpired }: PostMediaProps) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const several = media.length > 1;

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const { scrollLeft, clientWidth } = event.currentTarget;
    setCurrent(Math.round(scrollLeft / clientWidth));
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-plum">
      <div
        className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto"
        onScroll={several ? onScroll : undefined}
        tabIndex={several ? 0 : undefined}
        role={several ? "region" : undefined}
        aria-label={several ? t("post.media.gallery", { count: media.length }) : undefined}
      >
        {media.map((item, index) => {
          const label = t("post.media.item", { index: index + 1, count: media.length, author });
          return (
            <div key={item.id ?? index} className="aspect-[4/5] w-full shrink-0 snap-center">
              {item.type === "VIDEO" ? (
                <video
                  src={item.url}
                  poster={item.thumbnailUrl}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={label}
                  className="size-full bg-ink object-contain"
                  onError={onExpired}
                />
              ) : (
                <img
                  src={item.url}
                  alt={label}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                  onError={onExpired}
                />
              )}
            </div>
          );
        })}
      </div>
      {several && (
        <>
          <span
            className="absolute top-3 right-3 rounded-full bg-ink/70 px-2 py-0.5 text-xs text-fg"
            aria-hidden="true"
          >
            {current + 1}/{media.length}
          </span>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden="true">
            {media.map((item, index) => (
              <span
                key={item.id ?? index}
                className={cn("size-1.5 rounded-full", index === current ? "bg-fg" : "bg-fg/40")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
