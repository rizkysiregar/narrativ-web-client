import { z } from "zod";

// Mirrors the backend's validation (RegisterUserRequest, ResetPasswordRequest, VerifyOtpRequest), so the user
// learns about a mistake before submitting. The backend stays the authority. Messages are translation keys.

const username = z
  .string()
  .trim()
  .min(3, "validation.username.size")
  .max(16, "validation.username.size")
  .regex(/^[A-Za-z0-9._]+$/, "validation.username.pattern");

// bcrypt only reads the first 72 bytes, so the backend refuses longer passwords
const password = z
  .string()
  .min(8, "validation.password.size")
  .max(64, "validation.password.size")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "validation.password.tooLong");

const name = z.string().trim().min(2, "validation.name.size").max(50, "validation.name.size");

const email = z.string().trim().pipe(z.email("validation.email.invalid"));

export const loginSchema = z.object({
  username: z.string().trim().min(1, "validation.username.required"),
  password: z.string().min(1, "validation.password.required"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: name,
    lastName: name,
    username,
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "validation.password.mismatch",
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const emailSchema = z.object({ email });
export type EmailValues = z.infer<typeof emailSchema>;

export const otpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "validation.otp.digits"),
});
export type OtpValues = z.infer<typeof otpSchema>;

export const newPasswordSchema = z
  .object({ newPassword: password, confirmPassword: z.string() })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "validation.password.mismatch",
  });
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
