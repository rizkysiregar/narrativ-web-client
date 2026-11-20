import { serverConfig } from "~/server/config.server";

/**
 * Digital Asset Links: tells Android that links of this host may open in the NARRATIV app (App Links). Needs the
 * app's package name and the SHA-256 fingerprints of its signing certificates (ANDROID_PACKAGE, ANDROID_CERT_SHA256);
 * without them there is nothing to declare.
 */
export function loader() {
  const { androidPackage, androidCertFingerprints } = serverConfig();
  if (!androidPackage || androidCertFingerprints.length === 0) {
    return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain" } });
  }
  const statement = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: androidPackage,
        sha256_cert_fingerprints: androidCertFingerprints,
      },
    },
  ];
  return Response.json(statement, { headers: { "Cache-Control": "public, max-age=3600" } });
}
