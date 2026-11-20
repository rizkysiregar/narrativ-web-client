import { ProfileMediaGrid } from "~/features/users";

import type { Route } from "./+types/profile-media";

export default function ProfileMedia({ params }: Route.ComponentProps) {
  return <ProfileMediaGrid username={params.username} />;
}
