import { ForgotPasswordFlow } from "~/features/auth/components/forgot-password-flow";
import { APP_NAME } from "~/shared/config/env";

import type { Route } from "./+types/forgot-password";

export const meta: Route.MetaFunction = () => [{ title: `Reset password · ${APP_NAME}` }];

export default function ForgotPassword() {
  return <ForgotPasswordFlow />;
}
