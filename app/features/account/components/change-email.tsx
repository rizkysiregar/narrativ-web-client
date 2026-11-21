import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { GoogleButton } from "~/features/google";
import { Button } from "~/shared/ui/button";
import { FormError } from "~/shared/ui/form-error";
import { FormField } from "~/shared/ui/form-field";
import { Input } from "~/shared/ui/input";
import { PasswordInput } from "~/shared/ui/password-input";

import { sendEmailChangeOtp, useConfirmEmailChange, useMe, type Proof } from "../api";
import { confirmEmailSchema, newEmailSchema, type ConfirmEmailValues, type NewEmailValues } from "../schemas";

/** New address, then the code sent to it plus the password. Other devices are signed out by the backend. */
export function ChangeEmail() {
  const { t } = useTranslation();
  const me = useMe();
  const [target, setTarget] = useState<{ email: string; minutes: string } | null>(null);

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      {me.data?.email && <p className="text-muted">{t("account.email.current", { email: me.data.email })}</p>}
      {target ? (
        <ConfirmStep
          email={target.email}
          minutes={target.minutes}
          onBack={() => {
            setTarget(null);
          }}
        />
      ) : (
        <EmailStep
          onSent={(email, minutes) => {
            setTarget({ email, minutes });
          }}
        />
      )}
    </div>
  );
}

function EmailStep({ onSent }: { onSent: (email: string, minutes: string) => void }) {
  const { t } = useTranslation();
  const form = useForm<NewEmailValues>({
    resolver: zodResolver(newEmailSchema),
    defaultValues: { email: "" },
  });
  const send = useMutation({
    mutationFn: ({ email }: NewEmailValues) => sendEmailChangeOtp(email),
    onSuccess: (delivery, { email }) => {
      onSent(email, delivery.expirationTimeInMinute ?? "");
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) =>
        void form.handleSubmit((values) => {
          send.mutate(values);
        })(event)
      }
    >
      <p className="text-muted">{t("account.email.intro")}</p>
      <FormError error={send.error} />
      <FormField label={t("account.email.new")} error={form.formState.errors.email}>
        <Input {...form.register("email")} type="email" autoComplete="email" autoFocus />
      </FormField>
      <Button type="submit" className="self-start" disabled={send.isPending}>
        {t("auth.forgot.submit")}
      </Button>
    </form>
  );
}

function ConfirmStep({ email, minutes, onBack }: { email: string; minutes: string; onBack: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirmEmailChange();
  const form = useForm<ConfirmEmailValues>({
    resolver: zodResolver(confirmEmailSchema),
    defaultValues: { otp: "", password: "" },
  });
  const { errors } = form.formState;
  const submit = (otp: string, proof: Proof) => {
    confirm.mutate(
      { email, otp, ...proof },
      {
        onSuccess: () => {
          toast.success(t("account.email.changed"));
          void navigate("/settings", { replace: true });
        },
      },
    );
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) =>
        void form.handleSubmit(({ otp, password }) => {
          submit(otp, { password });
        })(event)
      }
    >
      <p className="text-muted">{t("auth.otp.sentTo", { email, minutes })}</p>
      <FormError error={confirm.error} />
      <FormField label={t("auth.fields.otp")} error={errors.otp}>
        <Input
          {...form.register("otp")}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
        />
      </FormField>
      <FormField
        label={t("account.email.password")}
        error={errors.password}
        hint={t("account.email.passwordHint")}
      >
        <PasswordInput {...form.register("password")} autoComplete="current-password" />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" disabled={confirm.isPending}>
          {t("account.email.confirm")}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          {t("auth.otp.changeEmail")}
        </Button>
      </div>
      <GoogleButton
        text="continue_with"
        divider={t("google.or")}
        hint={t("google.verify")}
        pending={confirm.isPending}
        onCredential={(idToken) => {
          // the code is still needed, only the password is replaced by the Google account
          void form.trigger("otp").then((valid) => {
            if (valid) {
              submit(form.getValues("otp").trim(), { idToken });
            }
          });
        }}
      />
    </form>
  );
}
