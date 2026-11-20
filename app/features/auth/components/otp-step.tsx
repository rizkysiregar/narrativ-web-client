import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useCountdown } from "~/shared/hooks/use-countdown";
import { Button } from "~/shared/ui/button";
import { FormField } from "~/shared/ui/form-field";
import { Input } from "~/shared/ui/input";

import { otpSchema, type OtpValues } from "../schemas";
import { AuthCard } from "./auth-card";
import { FormError } from "./form-error";

// the Android app waits as long before it offers a new code
const RESEND_AFTER_SECONDS = 60;

interface OtpStepProps {
  email: string;
  expiresInMinutes: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<unknown>;
  onBack: () => void;
}

/** Asks for the 6-digit code sent to an email, with a resend after a cooldown. */
export function OtpStep({ email, expiresInMinutes, onVerify, onResend, onBack }: OtpStepProps) {
  const { t } = useTranslation();
  const [sentCount, setSentCount] = useState(1);
  const form = useForm<OtpValues>({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" } });
  const verify = useMutation({ mutationFn: (values: OtpValues) => onVerify(values.otp) });
  const resend = useMutation({
    mutationFn: onResend,
    onSuccess: () => {
      setSentCount((count) => count + 1);
      form.reset();
      toast.success(t("auth.otp.resent"));
    },
  });

  return (
    <AuthCard
      title={t("auth.otp.title")}
      subtitle={t("auth.otp.sentTo", { email, minutes: expiresInMinutes })}
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) =>
          void form.handleSubmit((values) => {
            verify.mutate(values);
          })(event)
        }
      >
        <FormError error={verify.error ?? resend.error} />
        <FormField label={t("auth.fields.otp")} error={form.formState.errors.otp}>
          <Input
            {...form.register("otp")}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            className="text-center text-2xl tracking-[0.5em]"
          />
        </FormField>
        <Button type="submit" size="lg" disabled={verify.isPending}>
          {t("auth.otp.submit")}
        </Button>
      </form>
      <div className="flex flex-col items-center gap-2 text-sm">
        {/* a new key per sent code restarts the cooldown */}
        <ResendButton
          key={sentCount}
          disabled={resend.isPending}
          onResend={() => {
            resend.mutate();
          }}
        />
        <Button variant="ghost" size="sm" onClick={onBack}>
          {t("auth.otp.changeEmail")}
        </Button>
      </div>
    </AuthCard>
  );
}

function ResendButton({ disabled, onResend }: { disabled: boolean; onResend: () => void }) {
  const { t } = useTranslation();
  const secondsLeft = useCountdown(RESEND_AFTER_SECONDS);

  return (
    <Button variant="ghost" size="sm" disabled={disabled || secondsLeft > 0} onClick={onResend}>
      {secondsLeft > 0 ? t("auth.otp.resendIn", { seconds: secondsLeft }) : t("auth.otp.resend")}
    </Button>
  );
}
