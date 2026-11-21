import type * as SentryModule from "./sentry-sdk";

import { APP_VERSION } from "~/shared/config/env";

type Sentry = typeof SentryModule;

// The SDK is loaded after the app started, so it costs the first paint nothing. Errors before that are kept and sent
// once it is there.
let enabled = false;
let sdk: Sentry | null = null;
const early: ((sentry: Sentry) => void)[] = [];

function withSentry(task: (sentry: Sentry) => void): void {
  if (sdk) {
    task(sdk);
  } else if (enabled && early.length < 20) {
    early.push(task);
  }
}

/**
 * Which deployment this is, from the host: the same image runs on dev and prod. Anything else (localhost, a preview
 * build) reports nothing.
 */
export function monitoringEnvironment(hostname: string): "production" | "development" | null {
  if (hostname === "app-narrativ.rizkysiregar.my.id") {
    return "production";
  }
  if (hostname === "app-dev-narrativ.rizkysiregar.my.id") {
    return "development";
  }
  return null;
}

/** A URL without its query and fragment: search terms, cursors and tokens stay out of the reports. */
export function withoutQuery(url: string): string {
  return url.replace(/[?#].*$/, "");
}

/**
 * Error reporting to Sentry for unexpected failures in the browser: crashes, unhandled rejections, render errors. The
 * backend's expected answers (validation, 401, 404, ...) are handled by the UI and never reported. No personal data:
 * no IP, no request bodies, only the user id and URLs without their query.
 */
export function initMonitoring(): boolean {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = monitoringEnvironment(location.hostname);
  if (!dsn || !environment) {
    return false;
  }
  enabled = true;
  void import("./sentry-sdk").then((sentry) => {
    start(sentry, dsn, environment);
    sdk = sentry;
    for (const task of early.splice(0)) {
      task(sentry);
    }
  });
  return true;
}

function start(Sentry: Sentry, dsn: string, environment: string): void {
  Sentry.init({
    dsn,
    environment,
    release: `narrativ-web-client@${import.meta.env.VITE_RELEASE ?? APP_VERSION}`,
    // no personal data: no user info from instrumentation, no cookies, headers, bodies or query strings
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    // errors only: no performance tracing or session replay
    tracesSampleRate: 0,
    ignoreErrors: [
      // browser extensions and old Safari noise
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],
    denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-web-extension:\/\//],
    beforeBreadcrumb(breadcrumb) {
      const data = breadcrumb.data;
      if (data && typeof data.url === "string") {
        data.url = withoutQuery(data.url);
      }
      if (data && breadcrumb.category === "navigation") {
        for (const key of ["from", "to"]) {
          if (typeof data[key] === "string") {
            data[key] = withoutQuery(data[key]);
          }
        }
      }
      return breadcrumb;
    },
    beforeSend(event) {
      if (event.request?.url) {
        event.request.url = withoutQuery(event.request.url);
      }
      delete event.request?.query_string;
      delete event.request?.cookies;
      return event;
    },
  });
}

export function reportError(error: unknown): void {
  withSentry((sentry) => sentry.captureException(error));
}

/** Who saw the error, by id only; null after signing out. */
export function setMonitoringUser(userId: string | null): void {
  withSentry((sentry) => {
    sentry.setUser(userId ? { id: userId } : null);
  });
}

/** For React's root error hooks (errors no boundary caught, or React recovered from). */
export function reportReactError(error: unknown, info: { componentStack?: string }): void {
  withSentry((sentry) =>
    sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack } } }),
  );
}
