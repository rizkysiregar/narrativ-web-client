import "./app.css";
import "~/shared/i18n";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { Toaster } from "sonner";

import { restoreSession } from "~/api/session";
import { APP_NAME, LANDING_URL } from "~/shared/config/env";
import { createQueryClient } from "~/shared/lib/query-client";
import { Button } from "~/shared/ui/button";
import { LogoMark } from "~/shared/ui/logo";
import { PageMessage } from "~/shared/ui/page-message";
import { Spinner } from "~/shared/ui/spinner";

import type { Route } from "./+types/root";

const DESCRIPTION = "NARRATIV: share your stories, follow people, and keep up with what they post.";

/**
 * The same tags for every page. Posts and profiles are only for signed-in users, so a link preview (WhatsApp, X, ...)
 * never shows their content: crawlers are not signed in and get the brand card of the public website. Nothing of
 * the app is indexed either.
 */
export const meta: Route.MetaFunction = () => [
  { title: APP_NAME },
  { name: "description", content: DESCRIPTION },
  { name: "robots", content: "noindex, nofollow" },
  { property: "og:site_name", content: APP_NAME },
  { property: "og:type", content: "website" },
  { property: "og:title", content: APP_NAME },
  { property: "og:description", content: DESCRIPTION },
  { property: "og:image", content: `${LANDING_URL}/og/og-id.png` },
  { name: "twitter:card", content: "summary_large_image" },
];

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  // installable as an app (PWA)
  { rel: "manifest", href: "/manifest.webmanifest" },
];

/**
 * Runs once before the first render (the start-up screen shows meanwhile): whether the refresh cookie still holds a
 * session decides between the app and the sign-in page.
 */
export async function clientLoader() {
  await restoreSession();
  return null;
}

// the session is tracked in memory afterwards; navigating must not repeat the start-up refresh
export const shouldRevalidate = () => false;

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0d0b14" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  // one client per app instance, so tests and a future server render never share a cache
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme="dark" position="top-center" />
    </QueryClientProvider>
  );
}

/** Shown while the app starts (SPA mode renders this into index.html). */
export function HydrateFallback() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6">
      <LogoMark className="h-14" />
      <Spinner label={t("app.loading")} />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useTranslation();

  if (import.meta.env.DEV) {
    console.error(error);
  }
  return (
    <PageMessage title={t("error.title")} body={t("error.body")}>
      <Button
        onClick={() => {
          location.reload();
        }}
      >
        {t("error.reload")}
      </Button>
    </PageMessage>
  );
}
