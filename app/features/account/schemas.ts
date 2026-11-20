import { z } from "zod";

// the backend's rules (UpdateMyUserRequest, ChangeEmailOtpRequest, ConfirmEmailChangeRequest); messages are keys

export const profileSchema = z.object({
  firstName: z.string().trim().min(2, "validation.name.size").max(50, "validation.name.size"),
  lastName: z.string().trim().min(2, "validation.name.size").max(50, "validation.name.size"),
  username: z
    .string()
    .trim()
    .min(3, "validation.username.size")
    .max(16, "validation.username.size")
    .regex(/^[A-Za-z0-9._]+$/, "validation.username.pattern"),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const newEmailSchema = z.object({
  email: z.string().trim().pipe(z.email("validation.email.invalid")),
});
export type NewEmailValues = z.infer<typeof newEmailSchema>;

export const confirmEmailSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "validation.otp.digits"),
  password: z.string().min(1, "validation.password.required"),
});
export type ConfirmEmailValues = z.infer<typeof confirmEmailSchema>;

export const passwordSchema = z.object({ password: z.string().min(1, "validation.password.required") });
export type PasswordValues = z.infer<typeof passwordSchema>;
