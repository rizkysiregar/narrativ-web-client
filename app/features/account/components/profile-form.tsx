import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "~/shared/ui/button";
import { FormError } from "~/shared/ui/form-error";
import { FormField } from "~/shared/ui/form-field";
import { Input } from "~/shared/ui/input";
import { QueryState } from "~/shared/ui/query-state";

import { useMe, useUpdateProfile, type Me } from "../api";
import { profileSchema, type ProfileValues } from "../schemas";
import { AvatarEditor } from "./avatar-editor";

export function EditProfile() {
  const me = useMe();

  if (!me.data) {
    return <QueryState error={me.error} onRetry={() => void me.refetch()} />;
  }
  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      <AvatarEditor me={me.data} />
      <ProfileForm me={me.data} />
    </div>
  );
}

function ProfileForm({ me }: { me: Me }) {
  const { t } = useTranslation();
  const update = useUpdateProfile();
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: me.firstName ?? "",
      lastName: me.lastName ?? "",
      username: me.username ?? "",
    },
  });
  const { errors, isDirty } = form.formState;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) =>
        void form.handleSubmit((values) => {
          update.mutate(values, {
            onSuccess: (saved) => {
              form.reset({
                firstName: saved.firstName ?? "",
                lastName: saved.lastName ?? "",
                username: saved.username ?? "",
              });
              toast.success(t("account.profile.saved"));
            },
          });
        })(event)
      }
    >
      <FormError error={update.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("auth.fields.firstName")} error={errors.firstName}>
          <Input {...form.register("firstName")} autoComplete="given-name" />
        </FormField>
        <FormField label={t("auth.fields.lastName")} error={errors.lastName}>
          <Input {...form.register("lastName")} autoComplete="family-name" />
        </FormField>
      </div>
      <FormField
        label={t("auth.fields.username")}
        error={errors.username}
        hint={t("account.profile.usernameHint")}
      >
        <Input {...form.register("username")} autoComplete="username" autoCapitalize="none" />
      </FormField>
      <Button type="submit" className="self-start" disabled={!isDirty || update.isPending}>
        {t("account.profile.save")}
      </Button>
    </form>
  );
}
