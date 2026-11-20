import "i18next";

import type en from "./locales/en.json";

// t() only accepts keys that exist in the English texts
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}
