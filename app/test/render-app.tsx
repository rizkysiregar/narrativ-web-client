import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { Toaster } from "sonner";

import ComingSoon from "~/routes/coming-soon";
import ForgotPassword from "~/routes/forgot-password";
import GuestLayout from "~/routes/guest";
import Login from "~/routes/login";
import Register from "~/routes/register";
import Shell from "~/routes/shell";
import { createQueryClient } from "~/shared/lib/query-client";

/** The real auth pages and app shell at a path, like routes.ts lays them out, without the start-up loader. */
export function renderApp(path: string) {
  const Stub = createRoutesStub([
    {
      Component: GuestLayout,
      children: [
        { path: "/login", Component: Login },
        { path: "/register", Component: Register },
        { path: "/forgot-password", Component: ForgotPassword },
      ],
    },
    {
      Component: Shell,
      children: [
        { id: "home", path: "/", Component: ComingSoon },
        { id: "explore", path: "/explore", Component: ComingSoon },
      ],
    },
  ]);
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <Stub initialEntries={[path]} />
      <Toaster />
    </QueryClientProvider>,
  );
}
