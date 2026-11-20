// Post media and profile pictures: presigned URLs of the MinIO host, the same one for dev and prod (bucket differs)
export const MEDIA_ORIGIN = "https://infra-minio.rizkysiregar.my.id";

/**
 * The Content-Security-Policy of a rendered page. Inline scripts (React Router's start-up and its loader data) run
 * only with this response's nonce, so no 'unsafe-inline' for scripts. Styles allow inline: sonner injects its
 * stylesheet at runtime, and inline styles cannot run code.
 */
export function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${MEDIA_ORIGIN}`,
    `media-src 'self' blob: ${MEDIA_ORIGIN}`,
    "font-src 'self'",
    // the API is same-origin (the ingress routes /api to the backend); post media upload straight to MinIO
    `connect-src 'self' ${MEDIA_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function securityHeaders(
  nonce: string,
  { allowIndexing }: { allowIndexing: boolean },
): Record<string, string> {
  return {
    "Content-Security-Policy": contentSecurityPolicy(nonce),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    ...(!allowIndexing && { "X-Robots-Tag": "noindex, nofollow" }),
  };
}
