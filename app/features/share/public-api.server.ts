import createClient from "openapi-fetch";

import type { paths } from "~/api/schema";
import type { Schemas } from "~/api/types";
import { serverConfig } from "~/server/config.server";
import { APP_VERSION } from "~/shared/config/env";

export type PublicPost = Schemas["PublicPostResponse"];
export type PublicProfile = Schemas["PublicProfileResponse"];

// a link preview must not wait long for the backend: without the data the page still renders, with generic tags
const TIMEOUT_MS = 3_000;

/**
 * The backend's public endpoints, called from the web client's server while it renders a shared link. The calls go
 * inside the cluster and carry the visitor's CF-Connecting-IP (set by Cloudflare, not forgeable by clients), so the
 * backend's per-IP rate limit counts the visitor and not this server.
 */
function client(request: Request) {
  const visitorIp = request.headers.get("CF-Connecting-IP");
  const language = request.headers.get("Accept-Language");
  return createClient<paths>({
    baseUrl: serverConfig().apiUrl,
    headers: {
      "X-Client-Platform": "web-ssr",
      "X-App-Version": APP_VERSION,
      ...(visitorIp && { "CF-Connecting-IP": visitorIp }),
      ...(language && { "Accept-Language": language }),
    },
  });
}

/** Null when the post is not public (deleted, taken down, author banned) or the backend did not answer in time. */
export async function fetchPublicPost(request: Request, postId: string): Promise<PublicPost | null> {
  return read(() =>
    client(request).GET("/public/posts/{postId}", {
      params: { path: { postId } },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
  );
}

export async function fetchPublicProfile(request: Request, username: string): Promise<PublicProfile | null> {
  return read(() =>
    client(request).GET("/public/users/{username}", {
      params: { path: { username } },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }),
  );
}

async function read<T>(call: () => Promise<{ data?: { data?: T }; response: Response }>): Promise<T | null> {
  try {
    const { data, response } = await call();
    if (!response.ok) {
      if (response.status !== 404) {
        console.error(`SSR.PUBLIC.FAILED status=${String(response.status)} url=${response.url}`);
      }
      return null;
    }
    return data?.data ?? null;
  } catch (error) {
    console.error("SSR.PUBLIC.UNREACHABLE", error);
    return null;
  }
}
