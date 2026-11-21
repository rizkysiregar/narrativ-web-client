import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

import { useSession } from "~/api/session";
import { initMonitoring, reportReactError, setMonitoringUser } from "~/shared/monitoring/sentry";

// React Router's default client entry, plus error reporting before anything renders
if (initMonitoring()) {
  useSession.subscribe((state, previous) => {
    if (state.user?.userId !== previous.user?.userId) {
      setMonitoringUser(state.user?.userId ?? null);
    }
  });
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
    {
      // errors React recovers from on its own, or that no error boundary caught
      onUncaughtError: reportReactError,
      onRecoverableError: reportReactError,
    },
  );
});
