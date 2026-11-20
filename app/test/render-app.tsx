import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { Toaster } from "sonner";

import ComingSoon from "~/routes/coming-soon";
import Explore from "~/routes/explore";
import Follows from "~/routes/follows";
import ForgotPassword from "~/routes/forgot-password";
import GuestLayout from "~/routes/guest";
import Home from "~/routes/home";
import Login from "~/routes/login";
import MyProfile from "~/routes/my-profile";
import NotFound from "~/routes/not-found";
import PostPage from "~/routes/post";
import Profile from "~/routes/profile";
import ProfileMedia from "~/routes/profile-media";
import ProfilePosts from "~/routes/profile-posts";
import Register from "~/routes/register";
import SearchPage from "~/routes/search";
import Shell from "~/routes/shell";
import { createQueryClient } from "~/shared/lib/query-client";

// Route modules take their params as props in the app (React Router's typegen); the stub passes them the same way.
type Page = Parameters<typeof createRoutesStub>[0][number]["Component"];
const page = (component: unknown) => component as Page;

/** The real pages at a path, laid out like routes.ts, without the start-up loader (tests set the session). */
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
        { path: "/", Component: Home },
        { path: "/explore", Component: Explore },
        { path: "/search", Component: SearchPage },
        { path: "/p/:postId", Component: page(PostPage) },
        {
          path: "/u/:username",
          Component: page(Profile),
          children: [
            { index: true, Component: page(ProfilePosts) },
            { path: "media", Component: page(ProfileMedia) },
          ],
        },
        { id: "followers", path: "/u/:username/followers", Component: page(Follows) },
        { id: "following", path: "/u/:username/following", Component: page(Follows) },
        { path: "/profile", Component: MyProfile },
        { id: "notifications", path: "/notifications", Component: ComingSoon },
        { path: "*", Component: NotFound },
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
