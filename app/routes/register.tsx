import { RegisterFlow } from "~/features/auth/components/register-flow";
import { APP_NAME } from "~/shared/config/env";

import type { Route } from "./+types/register";

export const meta: Route.MetaFunction = () => [{ title: `Create account · ${APP_NAME}` }];

export default function Register() {
  return <RegisterFlow />;
}
