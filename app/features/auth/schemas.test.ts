import { describe, expect, it } from "vitest";

import { loginSchema, otpSchema, registerSchema } from "./schemas";

const valid = {
  firstName: "Ani",
  lastName: "Wijaya",
  username: "ani.w_1",
  email: "ani@example.com",
  password: "rahasia123",
  confirmPassword: "rahasia123",
};

const issues = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => Object.fromEntries((result.error?.issues ?? []).map((issue) => [issue.path.join("."), issue.message]));

describe("registerSchema", () => {
  it("accepts what the backend accepts", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("follows the backend's username rules", () => {
    expect(issues(registerSchema.safeParse({ ...valid, username: "an" }))).toEqual({
      username: "validation.username.size",
    });
    expect(issues(registerSchema.safeParse({ ...valid, username: "a".repeat(17) }))).toEqual({
      username: "validation.username.size",
    });
    expect(issues(registerSchema.safeParse({ ...valid, username: "ani-w" }))).toEqual({
      username: "validation.username.pattern",
    });
  });

  it("refuses a password longer than bcrypt reads (72 bytes)", () => {
    const emoji = "😀".repeat(19); // 19 characters but 76 bytes
    expect(issues(registerSchema.safeParse({ ...valid, password: emoji, confirmPassword: emoji }))).toEqual({
      password: "validation.password.tooLong",
    });
  });

  it("asks for the same password twice", () => {
    expect(issues(registerSchema.safeParse({ ...valid, confirmPassword: "something" }))).toEqual({
      confirmPassword: "validation.password.mismatch",
    });
  });

  it("checks names and email", () => {
    expect(issues(registerSchema.safeParse({ ...valid, firstName: " A ", email: "ani@" }))).toEqual({
      firstName: "validation.name.size",
      email: "validation.email.invalid",
    });
  });
});

describe("loginSchema and otpSchema", () => {
  it("needs a username and a password", () => {
    expect(issues(loginSchema.safeParse({ username: " ", password: "" }))).toEqual({
      username: "validation.username.required",
      password: "validation.password.required",
    });
  });

  it("needs exactly 6 digits", () => {
    expect(otpSchema.safeParse({ otp: "123456" }).success).toBe(true);
    expect(otpSchema.safeParse({ otp: "12345a" }).success).toBe(false);
    expect(otpSchema.safeParse({ otp: "12345" }).success).toBe(false);
  });
});
