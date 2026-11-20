import { http, HttpResponse } from "msw";

import { api, server } from "./server";

export const ok = (data: unknown) => HttpResponse.json({ code: "200", message: "Success", data });

export const fail = (status: number, message: string, errorCode: string) =>
  HttpResponse.json({ code: String(status), message, data: null, errorCode }, { status });

// what /auth/login answers a web client: no refreshToken, that one is the HttpOnly cookie
export const loginResponse = (username = "ani") => ({
  token: `access-of-${username}`,
  userId: "u1",
  username,
  role: "USER" as const,
});

/** Records the JSON bodies a POST endpoint receives and answers with `respond`. */
export function onPost(path: string, respond: (body: Record<string, unknown>) => Response) {
  const bodies: Record<string, unknown>[] = [];
  server.use(
    http.post(api(path), async ({ request }) => {
      const text = await request.text();
      const body = (text ? JSON.parse(text) : {}) as Record<string, unknown>;
      bodies.push(body);
      return respond(body);
    }),
  );
  return bodies;
}
