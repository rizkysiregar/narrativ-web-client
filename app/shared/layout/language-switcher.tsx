import { useTranslation } from "react-i18next";

import { changeLanguage, LANGUAGES, type Language } from "~/shared/i18n";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="sr-only">{t("language.label")}</span>
      <select
        value={i18n.language}
        onChange={(event) => void changeLanguage(event.target.value as Language)}
        className="rounded-lg border border-line bg-plum px-2 py-1 text-fg"
      >
        {LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {t(`language.${language}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
