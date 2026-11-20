import { useTranslation } from "react-i18next";

import { PostList, useUserPosts } from "~/features/posts";

import type { Route } from "./+types/profile-posts";

export default function ProfilePosts({ params }: Route.ComponentProps) {
  const { t } = useTranslation();
  const posts = useUserPosts(params.username);

  return <PostList query={posts} empty={{ title: t("profile.noPosts") }} />;
}
