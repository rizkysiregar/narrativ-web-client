import { useState } from "react";

import { cn } from "~/shared/lib/cn";

const SIZES = { sm: "size-9 text-sm", md: "size-11 text-base", lg: "size-24 text-3xl" };

interface AvatarProps {
  src?: string | undefined;
  /** The username: its first letter stands in when there is no picture, or it fails to load. */
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const classes = cn("shrink-0 rounded-full bg-plum-2 object-cover", SIZES[size], className);

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className={cn(classes, "flex items-center justify-center font-semibold text-lilac uppercase")}
      >
        {name.charAt(0)}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={classes}
      onError={() => {
        setFailed(true);
      }}
    />
  );
}
