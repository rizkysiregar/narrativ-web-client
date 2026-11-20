import { CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/shared/lib/cn";

const TONES = {
  error: { icon: CircleAlert, className: "border-danger/40 bg-danger/10 text-fg" },
  success: { icon: CircleCheck, className: "border-lilac/40 bg-lilac/10 text-fg" },
};

export function Alert({ tone = "error", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  const { icon: Icon, className } = TONES[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-2.5 rounded-xl border p-3 text-sm", className)}
    >
      <Icon className="mt-px size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
