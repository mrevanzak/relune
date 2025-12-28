import * as z from "zod";

/**
 * Shared environment variable schemas.
 */

export const serverSchema = {
  DATABASE_URL: z.string(),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  // Server-only: use for privileged operations that must bypass RLS (eg. Storage uploads).
  // Never expose this to clients.
  SUPABASE_SECRET_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  ALLOWED_EMAILS: z
    .string()
    .default("")
    .transform((val) =>
      val
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  CORS_ORIGIN: z.string().default(""),
  ENABLE_SWAGGER: z
    .string()
    .default("false")
    .transform((val) => val === "true"),
};

export const clientSchema = {
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_API_URL: z.url().default("http://localhost:3000"),
};
