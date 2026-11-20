import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { readPreference, writePreference } from "~/shared/lib/storage";

import en from "./locales/en.json";
import id from "./locales/id.json";

export const LANGUAGES = ["id", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

const STORAGE_KEY = "narrativ.language";

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language);
}

function initialLanguage(): Language {
  const stored = readPreference(STORAGE_KEY);
  if (isLanguage(stored)) {
    return stored;
  }
  const browser = typeof navigator === "undefined" ? "" : navigator.language;
  return browser.toLowerCase().startsWith("id") ? "id" : "en";
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, id: { translation: id } },
  lng: initialLanguage(),
  fallbackLng: "en",
  supportedLngs: LANGUAGES,
  // React escapes what it renders
  interpolation: { escapeValue: false },
  // the resources are bundled, so the first render already has its texts
  initAsync: false,
});

function applyToDocument(language: string) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
}

applyToDocument(i18n.language);
i18n.on("languageChanged", (language) => {
  writePreference(STORAGE_KEY, language);
  applyToDocument(language);
});

export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : "en";
}

export async function changeLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
}

export { i18n };
