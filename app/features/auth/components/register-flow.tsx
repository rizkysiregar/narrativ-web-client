import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";

import { GoogleButton } from "~/features/google";
import { LANDING_URL } from "~/shared/config/env";
import { Button } from "~/shared/ui/button";
import { FormField } from "~/shared/ui/form-field";
import { Input } from "~/shared/ui/input";
import { PasswordInput } from "~/shared/ui/password-input";

import { register, sendRegisterOtp, useGoogleLogin, verifyRegisterOtp } from "../api";
import { registerSchema, type RegisterValues } from "../schemas";
import { AuthCard } from "./auth-card";
import { FormError } from "~/shared/ui/form-error";
import { OtpStep } from "./otp-step";

// the backend keeps a registration token for 10 minutes; stop reusing it a little earlier
const TOKEN_VALID_MS = 9 * 60 * 1000;

interface VerifiedEmail {
  email: string;
  token: string;
  verifiedAt: number;
}

type Step = { name: "form" } | { name: "otp"; values: RegisterValues; expiresInMinutes: string };

/**
 * The form, then the email code where the backend verifies emails, then the account is created and signed in.
 * A failed registration (a taken username) goes back to the form; a verified email is then not asked for again.
 */
export function RegisterFlow() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>({ name: "form" });
  const verified = useRef<VerifiedEmail | null>(null);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const { errors } = form.formState;
  const google = useGoogleLogin();

  const createAccount = useMutation({
    mutationFn: ({ values, token }: { values: RegisterValues; token: string | null }) =>
      register(values, token),
    onSuccess: () => {
      // routes/guest.tsx moves on to the app as soon as the session exists
      toast.success(t("auth.register.success"));
    },
    onError: () => {
      setStep({ name: "form" });
    },
  });

  const start = useMutation({
    mutationFn: async (values: RegisterValues) => {
      const known = verified.current;
      if (known?.email === values.email && Date.now() - known.verifiedAt < TOKEN_VALID_MS) {
        createAccount.mutate({ values, token: known.token });
        return;
      }
      const delivery = await sendRegisterOtp(values.email);
      if (delivery.verificationRequired) {
        setStep({ name: "otp", values, expiresInMinutes: delivery.expirationTimeInMinute ?? "" });
      } else {
        createAccount.mutate({ values, token: null });
      }
    },
  });

  if (step.name === "otp") {
    const { values } = step;
    return (
      <OtpStep
        email={values.email}
        expiresInMinutes={step.expiresInMinutes}
        onVerify={async (otp) => {
          const token = await verifyRegisterOtp(values.email, otp);
          verified.current = { email: values.email, token, verifiedAt: Date.now() };
          await createAccount.mutateAsync({ values, token }).catch(() => undefined);
        }}
        onResend={() => sendRegisterOtp(values.email)}
        onBack={() => {
          setStep({ name: "form" });
        }}
      />
    );
  }

  const legal = (page: "terms" | "privacy") => `${LANDING_URL}${i18n.language === "en" ? "/en" : ""}/${page}`;
  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
  const busy = start.isPending || createAccount.isPending || google.isPending;

  return (
    <AuthCard
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
      footer={
        <>
          {t("auth.register.hasAccount")}{" "}
          <Link to={`/login${query}`} className="font-semibold text-lilac hover:underline">
            {t("auth.register.toLogin")}
          </Link>
        </>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) =>
          void form.handleSubmit((values) => {
            start.mutate(values);
          })(event)
        }
      >
        <FormError error={start.error ?? createAccount.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t("auth.fields.firstName")} error={errors.firstName}>
            <Input {...form.register("firstName")} autoComplete="given-name" autoFocus />
          </FormField>
          <FormField label={t("auth.fields.lastName")} error={errors.lastName}>
            <Input {...form.register("lastName")} autoComplete="family-name" />
          </FormField>
        </div>
        <FormField label={t("auth.fields.username")} error={errors.username}>
          <Input {...form.register("username")} autoComplete="username" autoCapitalize="none" />
        </FormField>
        <FormField label={t("auth.fields.email")} error={errors.email}>
          <Input {...form.register("email")} type="email" autoComplete="email" />
        </FormField>
        <FormField label={t("auth.fields.password")} error={errors.password}>
          <PasswordInput {...form.register("password")} autoComplete="new-password" />
        </FormField>
        <FormField label={t("auth.fields.confirmPassword")} error={errors.confirmPassword}>
          <PasswordInput {...form.register("confirmPassword")} autoComplete="new-password" />
        </FormField>
        <p className="text-sm text-muted">
          <Trans
            i18nKey="auth.register.agreement"
            components={{
              terms: (
                <a
                  href={legal("terms")}
                  target="_blank"
                  rel="noreferrer"
                  className="text-lilac underline underline-offset-2"
                />
              ),
              privacy: (
                <a
                  href={legal("privacy")}
                  target="_blank"
                  rel="noreferrer"
                  className="text-lilac underline underline-offset-2"
                />
              ),
            }}
          />
        </p>
        <Button type="submit" size="lg" disabled={busy}>
          {t("auth.register.submit")}
        </Button>
      </form>
      <GoogleButton
        text="signup_with"
        divider={t("google.or")}
        pending={google.isPending}
        error={google.error}
        onCredential={(idToken) => {
          google.mutate(idToken);
        }}
      />
    </AuthCard>
  );
}
