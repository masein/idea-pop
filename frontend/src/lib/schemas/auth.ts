import { z } from "zod";

const CURRENT_YEAR = 2026;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
    passwordConfirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Passwords don't match",
    path: ["passwordConfirm"],
  });
export type RegisterFormData = z.infer<typeof registerSchema>;

// kidProfileSchema messages are translation KEYS (namespace onboarding.kid),
// resolved at render via next-intl — the onboarding form is the only consumer.
export const kidProfileSchema = z.object({
  avatar_id: z.string().min(1, "err_avatar"),
  nickname: z
    .string()
    .min(2, "err_nickname_min")
    .max(20, "err_nickname_max")
    // Unicode-aware: accept letters/numbers from ANY script (Persian, Arabic,
    // etc.) plus space, underscore and hyphen. The old /[a-zA-Z0-9]/ rejected
    // non-ASCII names like "کاوشگر".
    .regex(/^[\p{L}\p{N} _-]+$/u, "err_nickname_chars"),
  birth_year: z
    .number()
    .int()
    .min(CURRENT_YEAR - 20, "err_birth_max_age")
    .max(CURRENT_YEAR - 4, "err_birth_min_age"),
  parent_email: z.string().email("err_parent_email"),
});
export type KidProfileFormData = z.infer<typeof kidProfileSchema>;

export const createClassSchema = z.object({
  name: z
    .string()
    .min(2, "Class name must be at least 2 characters")
    .max(80, "Class name must be 80 characters or less"),
});
export type CreateClassFormData = z.infer<typeof createClassSchema>;
