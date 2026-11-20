import type { ComponentProps } from "react";

import { cn } from "~/shared/lib/cn";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-line bg-plum px-3.5 text-fg transition-colors placeholder:text-muted/70",
        "focus:border-lilac focus:outline-none disabled:opacity-60 aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}
