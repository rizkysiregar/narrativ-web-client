import { Navigate } from "react-router";

import { useSession } from "~/api/session";

/** The Profile tab: the signed-in user's own profile page. */
export default function MyProfile() {
  const username = useSession((state) => state.user?.username);

  return <Navigate to={username ? `/u/${username}` : "/"} replace />;
}
