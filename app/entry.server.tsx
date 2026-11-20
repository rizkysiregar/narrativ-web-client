import { randomBytes } from "node:crypto";
import { PassThrough } from "node:stream";

import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter, type EntryContext } from "react-router";

import { serverConfig } from "./server/config.server";
import { securityHeaders } from "./server/security-headers";

export const streamTimeout = 5_000;

/**
 * Renders a page on the server. Every response gets its own CSP nonce for React Router's inline scripts, and the
 * security headers; in development Vite injects its own scripts, so the policy is left out there.
 */
export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  const nonce = randomBytes(16).toString("base64");
  if (process.env.NODE_ENV === "production") {
    for (const [name, value] of Object.entries(securityHeaders(nonce, serverConfig()))) {
      responseHeaders.set(name, value);
    }
  }

  // https://httpwg.org/specs/rfc9110.html#HEAD: the same headers as GET, no body
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, { status: responseStatusCode, headers: responseHeaders });
  }

  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent");
    // crawlers (link previews) get the complete page at once
    const readyOption = userAgent && isbot(userAgent) ? "onAllReady" : "onShellReady";
    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
      abort();
    }, streamTimeout + 1000);

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} nonce={nonce} />,
      {
        nonce,
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
              callback();
            },
          });
          responseHeaders.set("Content-Type", "text/html");
          pipe(body);
          resolve(
            new Response(createReadableStreamFromReadable(body), {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
        },
        onShellError(error: unknown) {
          reject(error instanceof Error ? error : new Error(String(error)));
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // errors of the initial shell reject above and are logged by React Router
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );
  });
}
