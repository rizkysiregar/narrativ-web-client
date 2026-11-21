import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { GoogleButton } from "~/features/google";
import { Button } from "~/shared/ui/button";
import { FormError } from "~/shared/ui/form-error";
import { FormField } from "~/shared/ui/form-field";
import { PasswordInput } from "~/shared/ui/password-input";

import { useDeleteAccount, type Proof } from "../api";
import { passwordSchema, type PasswordValues } from "../schemas";

export function DeleteAccount() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const remove = useDeleteAccount();
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });
  const confirm = (proof: Proof) => {
    remove.mutate(proof, {
      onSuccess: () => {
        toast.success(t("account.delete.done"));
        void navigate("/login", { replace: true });
      },
    });
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4 px-4 py-6"
      onSubmit={(event) =>
        void form.handleSubmit(({ password }) => {
          confirm({ password });
        })(event)
      }
    >
      <p>{t("account.delete.intro")}</p>
      <ul className="list-disc pl-5 text-muted">
        <li>{t("account.delete.posts")}</li>
        <li>{t("account.delete.final")}</li>
      </ul>
      <FormError error={remove.error} />
      <FormField label={t("account.delete.password")} error={form.formState.errors.password}>
        <PasswordInput {...form.register("password")} autoComplete="current-password" />
      </FormField>
      <Button type="submit" variant="danger" className="self-start" disabled={remove.isPending}>
        {t("account.delete.confirm")}
      </Button>
      <GoogleButton
        text="continue_with"
        divider={t("google.or")}
        hint={t("google.verify")}
        pending={remove.isPending}
        onCredential={(idToken) => {
          confirm({ idToken });
        }}
      />
    </form>
  );
}
