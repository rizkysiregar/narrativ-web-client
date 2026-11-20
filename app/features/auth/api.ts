import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { api } from "~/api/client";
import { request } from "~/api/errors";
import { endSession, startSession } from "~/api/session";

import type { LoginValues, RegisterValues } from "./schemas";

// The backend's auth endpoints. A web client gets its refresh token as an HttpOnly cookie (X-Client-Platform: web),
// so only the access token passes through here, into the in-memory session.

export async function login(values: LoginValues): Promise<void> {
  startSession(await request(api.POST("/auth/login", { body: values })));
}

/** Sends the registration code, or answers verificationRequired: false where emails are not verified. */
export function sendRegisterOtp(email: string) {
  return request(api.POST("/auth/register/otp", { body: { email } }));
}

export async function verifyRegisterOtp(email: string, otp: string): Promise<string> {
  const { registrationToken } = await request(
    api.POST("/auth/register/verify-otp", { body: { email, otp } }),
  );
  if (!registrationToken) {
    throw new Error("No registration token in the answer");
  }
  return registrationToken;
}

/** Creates the account and signs in with it: registering answers no session of its own. */
export async function register(values: RegisterValues, registrationToken: string | null): Promise<void> {
  const { firstName, lastName, username, email, password } = values;
  await request(
    api.POST("/auth/register", {
      body: {
        firstName,
        lastName,
        username,
        email,
        password,
        ...(registrationToken && { registrationToken }),
      },
    }),
  );
  await login({ username, password });
}

export function sendPasswordResetOtp(email: string) {
  return request(api.POST("/auth/forgot-password", { body: { email } }));
}

export async function verifyPasswordResetOtp(email: string, otp: string): Promise<string> {
  const { resetToken } = await request(api.POST("/auth/verify-otp", { body: { email, otp } }));
  if (!resetToken) {
    throw new Error("No reset token in the answer");
  }
  return resetToken;
}

export async function resetPassword(email: string, resetToken: string, newPassword: string): Promise<void> {
  await request(api.POST("/auth/reset-password", { body: { email, resetToken, newPassword } }));
}

export function useLogin() {
  return useMutation({ mutationFn: login });
}

/**
 * Signs out: the backend revokes the refresh cookie, the in-memory session and every cached server answer go. The
 * local sign-out happens even when the backend cannot be reached, the cookie then simply expires.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      await request(api.POST("/auth/logout")).catch(() => undefined);
    },
    onSettled: async () => {
      endSession();
      queryClient.clear();
      await navigate("/login", { replace: true });
    },
  });
}
