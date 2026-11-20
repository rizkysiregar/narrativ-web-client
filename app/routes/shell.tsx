import { Outlet } from "react-router";

import { AppShell } from "~/shared/layout/app-shell";

export default function Shell() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
