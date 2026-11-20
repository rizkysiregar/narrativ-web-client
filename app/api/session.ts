import { create } from "zustand";

import { ApiError } from "./errors";
import { clientHeaders } from "./headers";
import type { LoginResponse } from "./types";
import { apiUrl } from "./url";

export type SessionStatus = "unknown" | "authenticated" | "anonymous";

export interface SessionUser {
  userId: string;
  username: string;
  role: "USER" | "ADMIN";
}

interface SessionState {
  /** unknown until the first refresh at start-up told whether the refresh cookie still holds a session. */
  status: SessionStatus;
  /** Lives in memory only. The refresh token is an HttpOnly cookie that scripts never see. */
  accessToken: string | null;
  user: SessionUser | null;
  /** Why the session ended without the user signing out (a ban), for the sign-in page. */
  endReason: string | null;
}

export const useSession = create<SessionState>()(() => ({
  status: "unknown",
  accessToken: null,
  user: null,
  endReason: null,
}));

export function getAccessToken(): string | null {
  return useSession.getState().accessToken;
}

export function startSession({ token, userId, username, role }: LoginResponse): void {
  if (!token || !userId || !username || !role) {
    throw new ApiError(200, "Incomplete session in the login response");
  }
  useSession.setState({
    status: "authenticated",
    accessToken: token,
    user: { userId, username, role },
    endReason: null,
  });
}

/** After the user changed their username: the session keeps showing the right one without signing in again. */
export function updateSessionUser(changes: Partial<SessionUser>): void {
  useSession.setState((state) => (state.user ? { user: { ...state.user, ...changes } } : {}));
}

export function endSession(endReason: string | null = null): void {
  useSession.setState({ status: "anonymous", accessToken: null, user: null, endReason });
}

/**
 * Finds out at start-up whether the refresh cookie still holds a session. Afterwards the status is never unknown
 * again: anonymous when there was no session or the backend could not be reached.
 */
export async function restoreSession(): Promise<void> {
  if (useSession.getState().status !== "unknown") {
    return;
  }
  await refreshSession();
  if (useSession.getState().status === "unknown") {
    endSession();
  }
}

let pending: Promise<boolean> | null = null;

/**
 * Trades the refresh cookie for a new access token. Calls made while one is under way share it, and tabs take turns
 * through a Web Lock: the backend rotates the refresh token on every use, so two tabs refreshing at the same moment
 * would end one of the sessions.
 *
 * @param staleToken the access token a request was refused with. When a newer one is already in place (another call
 *   refreshed meanwhile), nothing is refreshed.
 * @returns whether there is a usable access token afterwards
 */
export function refreshSession(staleToken?: string): Promise<boolean> {
  const { accessToken } = useSession.getState();
  if (staleToken !== undefined && accessToken !== null && accessToken !== staleToken) {
    return Promise.resolve(true);
  }
  pending ??= withRefreshLock(callRefresh).finally(() => {
    pending = null;
  });
  return pending;
}

async function callRefresh(): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch(apiUrl("/auth/refresh"), {
      method: "POST",
      headers: clientHeaders(),
      credentials: "same-origin",
    });
  } catch {
    // offline: the session may still be fine, only the call that needed the refresh fails
    return false;
  }

  const body: unknown = await response.json().catch(() => null);
  if (response.ok) {
    startSession((body as { data: LoginResponse }).data);
    return true;
  }

  const error = ApiError.fromBody(response.status, body);
  // a refused refresh ends the session; a server failure only does so before any session was known
  if (response.status === 401 || response.status === 403 || useSession.getState().status === "unknown") {
    endSession(error.isBan ? error.message : null);
  }
  return false;
}

function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  // Web Locks are missing in old browsers and in jsdom; a single tab is then still covered by `pending`
  if ("locks" in navigator) {
    return navigator.locks.request("narrativ:refresh-session", task);
  }
  return task();
}
