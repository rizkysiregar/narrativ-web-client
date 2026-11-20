import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

// Placeholder pages share one module under their own route id; each is replaced by its feature in a later phase.
export default [
  layout("routes/shell.tsx", [
    index("routes/coming-soon.tsx", { id: "home" }),
    route("explore", "routes/coming-soon.tsx", { id: "explore" }),
    route("search", "routes/coming-soon.tsx", { id: "search" }),
    route("notifications", "routes/coming-soon.tsx", { id: "notifications" }),
    route("profile", "routes/coming-soon.tsx", { id: "profile" }),
    route("*", "routes/not-found.tsx"),
  ]),
] satisfies RouteConfig;
