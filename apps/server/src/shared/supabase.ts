import { env } from "@relune/env";
import { createClient } from "@supabase/supabase-js";

// Privileged server-side client (bypasses RLS). Must use the service role key.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);
