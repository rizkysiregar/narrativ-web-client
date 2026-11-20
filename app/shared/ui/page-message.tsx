import type { ReactNode } from "react";

/** A centered title, text and optional actions: empty states, errors and placeholders. */
export function PageMessage({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      <h1 className="heading text-3xl">{title}</h1>
      <p className="text-muted">{body}</p>
      {children && <div className="mt-4 flex gap-3">{children}</div>}
    </section>
  );
}
