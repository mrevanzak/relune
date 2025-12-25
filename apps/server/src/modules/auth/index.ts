import { createClient } from "@supabase/supabase-js";
import { getEnvList, requireEnv } from "../../shared/env";
import { createAuthPlugin } from "./service";

const supabaseUrl = requireEnv("SUPABASE_URL");
const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const allowedEmails = getEnvList("ALLOWED_EMAILS");

export const auth = createAuthPlugin({
	allowedEmails,
	getUser: async (token) => {
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser(token);

		return { user, error };
	},
});

// Re-export types for convenience
export type { AuthUser, GetUserFn, GetUserResult } from "./service";
