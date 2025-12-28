import { env } from "@relune/env";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for auth validation and storage operations.
 * Uses service role key for admin operations.
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

/**
 * Validate a Supabase access token and return user info.
 * Used by auth middleware to verify Bearer tokens.
 */
export async function validateToken(token: string): Promise<{
  user: { id: string; email?: string } | null;
  error: Error | null;
}> {
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { user: null, error: error ?? new Error("Invalid token") };
  }

  return {
    user: { id: data.user.id, email: data.user.email },
    error: null,
  };
}
