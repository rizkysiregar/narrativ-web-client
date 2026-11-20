import { afterEach, describe, expect, it, vi } from "vitest";

import { loader as assetlinks } from "./assetlinks";
import { loader as healthz } from "./healthz";
import { loader as robots } from "./robots";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resource routes", () => {
  it("answers the probes", async () => {
    const response = healthz();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok\n");
  });

  it("closes everything to search engines unless indexing is allowed", async () => {
    expect(await robots().text()).toContain("Disallow: /");
    expect(await robots().text()).not.toContain("Allow: /p/");

    vi.stubEnv("ALLOW_INDEXING", "true");
    const allowed = await robots().text();
    expect(allowed).toContain("Allow: /p/");
    expect(allowed).toContain("Allow: /u/");
  });

  it("declares the Android app only when it is configured", async () => {
    expect(assetlinks().status).toBe(404);

    vi.stubEnv("ANDROID_PACKAGE", "com.rizkysiregar.narrativ");
    vi.stubEnv("ANDROID_CERT_SHA256", "AA:BB");
    const response = assetlinks();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.rizkysiregar.narrativ",
          sha256_cert_fingerprints: ["AA:BB"],
        },
      },
    ]);
  });
});
