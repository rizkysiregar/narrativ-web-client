import { LoginForm } from "~/features/auth/components/login-form";
import { APP_NAME } from "~/shared/config/env";

import type { Route } from "./+types/login";

export const meta: Route.MetaFunction = () => [{ title: `Sign in · ${APP_NAME}` }];

export default function Login() {
  return <LoginForm />;
}
