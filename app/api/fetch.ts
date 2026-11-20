import { clientHeaders } from "./headers";
import { getAccessToken, refreshSession } from "./session";

/**
 * The fetch behind the API client: adds the client headers and the access token, and when the backend refuses an
 * expired access token (401), refreshes the session once and repeats the call with the new token.
 */
export async function apiFetch(request: Request): Promise<Response> {
  const retry = request.clone();
  const token = prepare(request);
  const response = await fetch(request);

  // without a token the 401 is about the call itself (wrong password, sign-in needed), not an expired session
  if (response.status !== 401 || token === null) {
    return response;
  }
  if (!(await refreshSession(token))) {
    return response;
  }
  prepare(retry);
  return fetch(retry);
}

/** Sets the headers of a call and answers the access token it carries. */
function prepare(request: Request): string | null {
  for (const [name, value] of Object.entries(clientHeaders())) {
    request.headers.set(name, value);
  }
  const token = getAccessToken();
  if (token !== null) {
    request.headers.set("Authorization", `Bearer ${token}`);
  }
  return token;
}
