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
    route("messages", "routes/messages.tsx"),
    route("messages/:channelId", "routes/message-thread.tsx"),
    route("notifications", "routes/notifications.tsx"),
    route("settings", "routes/settings.tsx"),
    route("settings/profile", "routes/settings-profile.tsx"),
    route("settings/email", "routes/settings-email.tsx"),
    route("settings/blocked", "routes/settings-blocked.tsx"),
    route("settings/delete-account", "routes/settings-delete.tsx"),
    route("*", "routes/not-found.tsx"),
  ]),
] satisfies RouteConfig;
