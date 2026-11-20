import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "./input";

export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-11" />
      <button
        type="button"
        onClick={() => {
          setVisible((current) => !current);
        }}
        aria-label={visible ? t("common.hidePassword") : t("common.showPassword")}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-fg"
      >
        <Icon className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
