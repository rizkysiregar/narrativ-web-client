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

    expect(csp).toContain("script-src 'self' 'sha256-abc'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain(`img-src 'self' data: blob: ${MEDIA_ORIGIN}`);
    expect(csp).toContain(`media-src 'self' blob: ${MEDIA_ORIGIN}`);
    expect(csp).toContain(`connect-src 'self' ${MEDIA_ORIGIN}`);
  });

  it("keeps every page out of search engines", () => {
    expect(securityHeaders("csp")).toContain('add_header X-Robots-Tag "noindex, nofollow" always;');
  });
});
