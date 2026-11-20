import { LoaderCircle } from "lucide-react";

import { cn } from "~/shared/lib/cn";

export function Spinner({ className, label }: { className?: string; label: string }) {
  return (
    <span role="status" className={cn("inline-flex text-lilac", className)}>
      <LoaderCircle className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
