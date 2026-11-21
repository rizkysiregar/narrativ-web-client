import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { cn } from "~/shared/lib/cn";

import type { PostMedia as Media } from "../api";

interface PostMediaProps {
  media: Media[];
  author: string;
  /** In a feed: a photo opens the post. Videos keep their own controls and never navigate. */
  href?: string | undefined;
  /** A media URL failed to load: presigned URLs expire after an hour, so the post should be fetched again. */
  onExpired?: (() => void) | undefined;
}

/**
 * One photo or video, or several side by side: swiped on touch screens (scroll snapping), moved with the arrow
 * buttons where there is a mouse, and with the arrow keys once the gallery has focus.
 */
export function PostMedia({ media, author, href, onExpired }: PostMediaProps) {
  const { t } = useTranslation();
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const several = media.length > 1;
  const last = media.length - 1;

  const show = (index: number) => {
    const element = track.current;
    if (!element) {
      return;
    }
    const target = Math.min(Math.max(index, 0), last);
    element.scrollTo({ left: target * element.clientWidth, behavior: "smooth" });
    setCurrent(target);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      show(current + (event.key === "ArrowRight" ? 1 : -1));
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-plum">
      <div
        ref={track}
        className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto"
        onScroll={
          several
            ? (event) => {
                const { scrollLeft, clientWidth } = event.currentTarget;
                setCurrent(Math.round(scrollLeft / clientWidth));
              }
            : undefined
        }
        onKeyDown={several ? onKeyDown : undefined}
        tabIndex={several ? 0 : undefined}
        role={several ? "region" : undefined}
        aria-label={several ? t("post.media.gallery", { count: media.length }) : undefined}
      >
        {media.map((item, index) => {
          const label = t("post.media.item", { index: index + 1, count: media.length, author });
          let content: ReactNode;
          if (item.type === "VIDEO") {
            content = (
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
            );
          } else {
            const image = (
              <img
                src={item.url}
                alt={label}
                loading="lazy"
                decoding="async"
                // a mouse drag must not pick the photo up (or the link around it)
                draggable={false}
                className="size-full object-cover"
                onError={onExpired}
              />
            );
            content = href ? (
              <Link
                to={href}
                draggable={false}
                className="block size-full"
                tabIndex={several ? -1 : undefined}
              >
                {image}
              </Link>
            ) : (
              image
            );
          }
          return (
            <div key={item.id ?? index} className="aspect-[4/5] w-full shrink-0 snap-center">
              {content}
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
          {/* touch screens swipe; the buttons are for a mouse and for assistive technology */}
          <GalleryButton
            label={t("post.media.previous")}
            hidden={current === 0}
            className="left-2"
            onClick={() => {
              show(current - 1);
            }}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </GalleryButton>
          <GalleryButton
            label={t("post.media.next")}
            hidden={current === last}
            className="right-2"
            onClick={() => {
              show(current + 1);
            }}
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </GalleryButton>
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

function GalleryButton({
  label,
  hidden,
  className,
  onClick,
  children,
}: {
  label: string;
  hidden: boolean;
  className: string;
  onClick: () => void;
  children: ReactNode;
}) {
  if (hidden) {
    return null;
  }
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-ink/70 text-fg backdrop-blur transition-colors hover:bg-ink",
        // a phone swipes; the buttons would only cover the photo
        "pointer-coarse:sr-only",
        className,
      )}
    >
      {children}
    </button>
  );
}
