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

export const kidProfileSchema = z.object({
  avatar_id: z.string().min(1, "Pick a character"),
  nickname: z
    .string()
    .min(2, "Nickname must be at least 2 characters")
    .max(20, "Nickname must be 20 characters or less")
    .regex(
      /^[a-zA-Z0-9 _-]+$/,
      "Only letters, numbers, spaces, _ and - allowed"
    ),
  birth_year: z
    .number()
    .int()
    .min(CURRENT_YEAR - 20, "Must be at most 20 years old")
    .max(CURRENT_YEAR - 4, "Must be at least 4 years old"),
  parent_email: z.string().email("Enter a valid parent email"),
});
export type KidProfileFormData = z.infer<typeof kidProfileSchema>;

export const createClassSchema = z.object({
  name: z
    .string()
    .min(2, "Class name must be at least 2 characters")
    .max(80, "Class name must be 80 characters or less"),
});
export type CreateClassFormData = z.infer<typeof createClassSchema>;
