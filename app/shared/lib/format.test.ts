import { describe, expect, it } from "vitest";

import { formatCount, formatRelativeTime } from "./format";

const now = new Date("2026-11-20T12:00:00Z").getTime();

describe("formatRelativeTime", () => {
  it("picks the largest unit that fits", () => {
    expect(formatRelativeTime("2026-11-20T11:55:00Z", "en", now)).toBe("5 min. ago");
    expect(formatRelativeTime("2026-11-20T09:00:00Z", "en", now)).toBe("3 hr. ago");
    expect(formatRelativeTime("2026-11-19T12:00:00Z", "en", now)).toBe("yesterday");
    expect(formatRelativeTime("2026-11-20T11:59:50Z", "en", now)).toBe("now");
  });

  it("speaks the user's language", () => {
    expect(formatRelativeTime("2026-11-19T12:00:00Z", "id", now)).toBe("kemarin");
  });
});

describe("formatCount", () => {
  it("shortens large numbers", () => {
    expect(formatCount(7, "en")).toBe("7");
    expect(formatCount(1234, "en")).toBe("1.2K");
  });
});
