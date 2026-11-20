import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";

import { useSession } from "~/api/session";
import { Alert } from "~/shared/ui/alert";
import { Button } from "~/shared/ui/button";
import { FormField } from "~/shared/ui/form-field";
import { Input } from "~/shared/ui/input";
import { PasswordInput } from "~/shared/ui/password-input";

import { useLogin } from "../api";
import { loginSchema, type LoginValues } from "../schemas";
import { AuthCard } from "./auth-card";
import { FormError } from "~/shared/ui/form-error";

export function LoginForm() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const endReason = useSession((state) => state.endReason);
  const login = useLogin();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });
  const { errors } = form.formState;
  // keep ?redirect= when switching to the registration page
  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : "";

  return (
    <AuthCard
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      footer={
        <>
          {t("auth.login.noAccount")}{" "}
          <Link to={`/register${query}`} className="font-semibold text-lilac hover:underline">
            {t("auth.login.toRegister")}
          </Link>
        </>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) =>
          void form.handleSubmit((values) => {
            login.mutate(values);
          })(event)
        }
      >
        {/* the session that ended (a ban) explains itself until the next sign-in */}
        {endReason && !login.error && <Alert>{endReason}</Alert>}
        <FormError error={login.error} />
        <FormField label={t("auth.fields.username")} error={errors.username}>
          <Input {...form.register("username")} autoComplete="username" autoCapitalize="none" autoFocus />
        </FormField>
        <FormField label={t("auth.fields.password")} error={errors.password}>
          <PasswordInput {...form.register("password")} autoComplete="current-password" />
        </FormField>
        <Link to="/forgot-password" className="self-end text-sm text-lilac hover:underline">
          {t("auth.login.forgot")}
        </Link>
        <Button type="submit" size="lg" disabled={login.isPending}>
          {t("auth.login.submit")}
        </Button>
      </form>
    </AuthCard>
  );
}
