import { describe, expect, it } from "vitest";

import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
  it("keeps paths of the app", () => {
    expect(safeRedirect("/explore?tab=new")).toBe("/explore?tab=new");
  });

  it("refuses anything that could leave the app", () => {
    for (const target of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "",
      null,
    ]) {
      expect(safeRedirect(target)).toBe("/");
    }
  });
});
