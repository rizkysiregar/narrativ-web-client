// Settings of the web client's own server (server rendering), read from its environment at call time. Files named
// *.server.ts never reach the browser bundle.

export interface ServerConfig {
  /** The backend inside the cluster, not through Cloudflare, so the visitor's CF-Connecting-IP can be passed on. */
  apiUrl: string;
  /** The public address of the app, for absolute links in link previews (og:url, og:image). */
  origin: string | undefined;
  /** Only production may be indexed by search engines. */
  allowIndexing: boolean;
  /** For /.well-known/assetlinks.json: links of this host open in the Android app. */
  androidPackage: string | undefined;
  androidCertFingerprints: string[];
}

export function serverConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const devBackend = env.API_PROXY_TARGET ?? "https://api-dev-narrativ.rizkysiregar.my.id";
  return {
    apiUrl: (env.API_INTERNAL_URL ?? `${devBackend}/api/v1`).replace(/\/+$/, ""),
    origin: env.APP_ORIGIN?.replace(/\/+$/, ""),
    allowIndexing: env.ALLOW_INDEXING === "true",
    androidPackage: env.ANDROID_PACKAGE,
    androidCertFingerprints: (env.ANDROID_CERT_SHA256 ?? "")
      .split(",")
      .map((fingerprint) => fingerprint.trim())
      .filter(Boolean),
  };
}

/** The app's public origin: configured, or else the one of the request (development). */
export function publicOrigin(request: Request): string {
  return serverConfig().origin ?? new URL(request.url).origin;
}
