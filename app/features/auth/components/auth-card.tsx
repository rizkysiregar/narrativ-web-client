import type { ReactNode } from "react";

/** Title, subtitle and content of an auth page; the page chrome comes from routes/guest.tsx. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="heading text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="text-muted">{subtitle}</p>}
      </header>
      {children}
      {footer && <footer className="text-center text-sm text-muted">{footer}</footer>}
    </section>
  );
}
