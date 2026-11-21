import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, inlineScriptHashes, MEDIA_ORIGIN, securityHeaders } from "./csp.mjs";

const sha = (text) => `'sha256-${createHash("sha256").update(text).digest("base64")}'`;

describe("csp", () => {
  it("hashes inline scripts and skips external ones", () => {
    const html = `<script>window.a = 1;</script><script type="module" src="/x.js"></script><script type="module" async="">import "/y.js";\n</script>`;

    expect(inlineScriptHashes(html)).toEqual([sha("window.a = 1;"), sha('import "/y.js";\n')]);
  });

  it("allows only the hashed inline scripts", () => {
    const csp = contentSecurityPolicy(["'sha256-abc'"]);

    expect(csp).toContain("script-src 'self' https://accounts.google.com/gsi/client 'sha256-abc'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain(`img-src 'self' data: blob: ${MEDIA_ORIGIN}`);
    expect(csp).toContain(`media-src 'self' blob: ${MEDIA_ORIGIN}`);
    expect(csp).toContain(
      `connect-src 'self' ${MEDIA_ORIGIN} https://firebaseinstallations.googleapis.com https://fcmregistrations.googleapis.com https://accounts.google.com/gsi/;`,
    );
  });

  it("lets Sign in with Google load its script, button and popup", () => {
    const csp = contentSecurityPolicy([]);

    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style");
    expect(csp).toContain("frame-src https://accounts.google.com/gsi/");
    expect(securityHeaders(csp)).toContain("Cross-Origin-Opener-Policy same-origin-allow-popups always;");
  });

  it("keeps every page out of search engines", () => {
    expect(securityHeaders("csp")).toContain('add_header X-Robots-Tag "noindex, nofollow" always;');
  });
});
