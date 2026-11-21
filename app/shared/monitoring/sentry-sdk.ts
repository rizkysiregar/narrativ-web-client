// Only what the app uses of the Sentry SDK, so the lazily loaded chunk carries no replay, tracing or feedback code.
export { captureException, init, setUser } from "@sentry/react";
