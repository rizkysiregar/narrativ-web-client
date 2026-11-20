import { describe, expect, it } from "vitest";

import { serverConfig } from "./config.server";
import { contentSecurityPolicy, MEDIA_ORIGIN, securityHeaders } from "./security-headers";

describe("contentSecurityPolicy", () => {
  it("allows inline scripts only with the response's nonce", () => {
    const csp = contentSecurityPolicy("abc123");

    expect(csp).toContain("script-src 'self' 'nonce-abc123'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).toContain(`img-src 'self' data: blob: ${MEDIA_ORIGIN}`);
    expect(csp).toContain(`connect-src 'self' ${MEDIA_ORIGIN}`);
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

describe("securityHeaders", () => {
  it("keeps search engines out unless indexing is allowed", () => {
    expect(securityHeaders("n", { allowIndexing: false })["X-Robots-Tag"]).toBe("noindex, nofollow");
    expect(securityHeaders("n", { allowIndexing: true })).not.toHaveProperty("X-Robots-Tag");
  });
});

describe("serverConfig", () => {
  it("reads the environment", () => {
    const config = serverConfig({
      API_INTERNAL_URL: "http://narrativ-service.narrativ-dev.svc/api/v1/",
      APP_ORIGIN: "https://app-dev-narrativ.rizkysiregar.my.id/",
      ALLOW_INDEXING: "true",
      ANDROID_PACKAGE: "com.example.app",
      ANDROID_CERT_SHA256: "AA:BB, CC:DD ,",
    });

    expect(config).toEqual({
      apiUrl: "http://narrativ-service.narrativ-dev.svc/api/v1",
      origin: "https://app-dev-narrativ.rizkysiregar.my.id",
      allowIndexing: true,
      androidPackage: "com.example.app",
      androidCertFingerprints: ["AA:BB", "CC:DD"],
    });
  });

  it("falls back to the dev backend and no indexing", () => {
    expect(serverConfig({})).toMatchObject({
      apiUrl: "https://api-dev-narrativ.rizkysiregar.my.id/api/v1",
      origin: undefined,
      allowIndexing: false,
      androidCertFingerprints: [],
    });
  });
});
