import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  // signed-out pages; a signed-in user is sent on to the app
  layout("routes/guest.tsx", [
    route("login", "routes/login.tsx"),
    route("register", "routes/register.tsx"),
    route("forgot-password", "routes/forgot-password.tsx"),
  ]),
  // the app itself needs a session. Placeholder pages share one module under their own route id; each is replaced by
  // its feature in a later phase.
  layout("routes/shell.tsx", [
    index("routes/coming-soon.tsx", { id: "home" }),
    route("explore", "routes/coming-soon.tsx", { id: "explore" }),
    route("search", "routes/coming-soon.tsx", { id: "search" }),
    route("notifications", "routes/coming-soon.tsx", { id: "notifications" }),
    route("profile", "routes/coming-soon.tsx", { id: "profile" }),
    route("*", "routes/not-found.tsx"),
  ]),
] satisfies RouteConfig;
