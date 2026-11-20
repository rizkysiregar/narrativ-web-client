import { UserSearch } from "~/features/users";
import { APP_NAME } from "~/shared/config/env";

import type { Route } from "./+types/search";

export const meta: Route.MetaFunction = () => [{ title: `Search · ${APP_NAME}` }];

export default function SearchPage() {
  return <UserSearch />;
}
