import { describe, expect, it } from "vitest";

import en from "./locales/en.json";
import id from "./locales/id.json";

function keys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key));
}

describe("locales", () => {
  it("Indonesian and English have the same keys", () => {
    expect(keys(id).sort()).toEqual(keys(en).sort());
  });

  it("no text is empty", () => {
    for (const locale of [en, id]) {
      const texts = keys(locale).map((key) =>
        key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], locale),
      );
      expect(texts.every((text) => typeof text === "string" && text.trim() !== "")).toBe(true);
    }
  });
});
