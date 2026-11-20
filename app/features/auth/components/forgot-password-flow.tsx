import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "~/shared/ui/button";
import { FormField } from "~/shared/ui/form-field";
import { Input } from "~/shared/ui/input";
import { PasswordInput } from "~/shared/ui/password-input";

import { resetPassword, sendPasswordResetOtp, verifyPasswordResetOtp } from "../api";
import { emailSchema, newPasswordSchema, type EmailValues, type NewPasswordValues } from "../schemas";
import { AuthCard } from "./auth-card";
import { FormError } from "~/shared/ui/form-error";
import { OtpStep } from "./otp-step";

type Step =
  | { name: "email" }
  | { name: "otp"; email: string; expiresInMinutes: string }
  | { name: "password"; email: string; resetToken: string };

/** Email, then the code sent to it, then a new password. */
export function ForgotPasswordFlow() {
  const [step, setStep] = useState<Step>({ name: "email" });

  switch (step.name) {
    case "email":
      return (
        <EmailStep
          onSent={(email, expiresInMinutes) => {
            setStep({ name: "otp", email, expiresInMinutes });
          }}
        />
      );
    case "otp":
      return (
        <OtpStep
          email={step.email}
          expiresInMinutes={step.expiresInMinutes}
          onVerify={async (otp) => {
            setStep({
              name: "password",
              email: step.email,
              resetToken: await verifyPasswordResetOtp(step.email, otp),
            });
          }}
          onResend={() => sendPasswordResetOtp(step.email)}
          onBack={() => {
            setStep({ name: "email" });
          }}
        />
      );
    case "password":
      return <NewPasswordStep email={step.email} resetToken={step.resetToken} />;
  }
}

function EmailStep({ onSent }: { onSent: (email: string, expiresInMinutes: string) => void }) {
  const { t } = useTranslation();
  const form = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } });
  // the backend answers the same for every email, registered or not, so this never tells who has an account
  const send = useMutation({
    mutationFn: ({ email }: EmailValues) => sendPasswordResetOtp(email),
    onSuccess: (delivery, { email }) => {
      onSent(email, delivery.expirationTimeInMinute ?? "");
    },
  });

  return (
    <AuthCard
      title={t("auth.forgot.title")}
      subtitle={t("auth.forgot.subtitle")}
      footer={
        <Link to="/login" className="font-semibold text-lilac hover:underline">
          {t("auth.forgot.toLogin")}
        </Link>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) =>
          void form.handleSubmit((values) => {
            send.mutate(values);
          })(event)
        }
      >
        <FormError error={send.error} />
        <FormField label={t("auth.fields.email")} error={form.formState.errors.email}>
          <Input {...form.register("email")} type="email" autoComplete="email" autoFocus />
        </FormField>
        <Button type="submit" size="lg" disabled={send.isPending}>
          {t("auth.forgot.submit")}
        </Button>
      </form>
    </AuthCard>
  );
}

function NewPasswordStep({ email, resetToken }: { email: string; resetToken: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  const { errors } = form.formState;
  const save = useMutation({
    mutationFn: ({ newPassword }: NewPasswordValues) => resetPassword(email, resetToken, newPassword),
    onSuccess: async () => {
      toast.success(t("auth.forgot.success"));
      await navigate("/login", { replace: true });
    },
  });

  return (
    <AuthCard title={t("auth.forgot.newTitle")} subtitle={t("auth.forgot.newSubtitle")}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) =>
          void form.handleSubmit((values) => {
            save.mutate(values);
          })(event)
        }
      >
        <FormError error={save.error} />
        <FormField label={t("auth.fields.newPassword")} error={errors.newPassword}>
          <PasswordInput {...form.register("newPassword")} autoComplete="new-password" autoFocus />
        </FormField>
        <FormField label={t("auth.fields.confirmPassword")} error={errors.confirmPassword}>
          <PasswordInput {...form.register("confirmPassword")} autoComplete="new-password" />
        </FormField>
        <Button type="submit" size="lg" disabled={save.isPending}>
          {t("auth.forgot.save")}
        </Button>
      </form>
    </AuthCard>
  );
}
