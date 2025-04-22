import { z } from "zod";

export const tokens = z.object({
    access_token: z.string(),
    refresh_token: z.string(),
});
export type Tokens = z.infer<typeof tokens>;

export const signupSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, {
    message: "Username must be at least 8 characters.",
  }),
});
export type SignupSchema = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  password: z.string().min(8, {
    message: "Username must be at least 8 characters.",
  }),
});
export type LoginSchema = z.infer<typeof loginSchema>;