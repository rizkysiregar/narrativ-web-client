import { describe, expect, it } from "vitest";

import { initMonitoring, monitoringEnvironment, withoutQuery } from "./sentry";

describe("monitoring", () => {
  it("knows the environment from the host and reports nothing elsewhere", () => {
    expect(monitoringEnvironment("app-narrativ.rizkysiregar.my.id")).toBe("production");
    expect(monitoringEnvironment("app-dev-narrativ.rizkysiregar.my.id")).toBe("development");
    expect(monitoringEnvironment("localhost")).toBeNull();
    // the tests run on localhost without a DSN
    expect(initMonitoring()).toBe(false);
  });

  it("drops the query and fragment of URLs", () => {
    expect(withoutQuery("https://app.test/api/v1/users?search=ani&page=0")).toBe(
      "https://app.test/api/v1/users",
    );
    expect(withoutQuery("/p/123#comments")).toBe("/p/123");
    expect(withoutQuery("/explore")).toBe("/explore");
  });
});
