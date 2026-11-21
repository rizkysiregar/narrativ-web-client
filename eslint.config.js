import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "build",
      ".react-router",
      "coverage",
      "app/api/schema.d.ts",
      "public/firebase-messaging-sw.js",
      "e2e-results",
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      // strict forbids `!`; this stylistic rule would ask for `!` instead of `as T`, so the two cannot both hold
      "@typescript-eslint/non-nullable-type-assertion-style": "off",
    },
  },
  {
    files: ["**/*.{js,mjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  reactHooks.configs.flat["recommended-latest"],
  prettier,
);
