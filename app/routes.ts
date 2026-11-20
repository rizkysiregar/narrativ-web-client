import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  // signed-out pages; a signed-in user is sent on to the app
  layout("routes/guest.tsx", [
    route("login", "routes/login.tsx"),
    route("register", "routes/register.tsx"),
    route("forgot-password", "routes/forgot-password.tsx"),
  ]),
  // the app itself needs a session
  layout("routes/shell.tsx", [
    index("routes/home.tsx"),
    route("explore", "routes/explore.tsx"),
    route("search", "routes/search.tsx"),
    route("p/:postId", "routes/post.tsx"),
    route("u/:username", "routes/profile.tsx", [
      index("routes/profile-posts.tsx"),
      route("media", "routes/profile-media.tsx"),
    ]),
    route("u/:username/followers", "routes/follows.tsx", { id: "followers" }),
    route("u/:username/following", "routes/follows.tsx", { id: "following" }),
    route("profile", "routes/my-profile.tsx"),
    // placeholder until its phase; the module shows the title of its route id
    route("notifications", "routes/coming-soon.tsx", { id: "notifications" }),
    route("*", "routes/not-found.tsx"),
  ]),
] satisfies RouteConfig;
