import { createClient } from "@supabase/supabase-js";
import { Elysia } from "elysia";
import { getEnvList, requireEnv } from "../../shared/env";
import { createAuthPlugin } from "./service";

const supabaseUrl = requireEnv("SUPABASE_URL");
const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const allowedEmails = getEnvList("ALLOWED_EMAILS");

const authPlugin = createAuthPlugin({
	allowedEmails,
	getUser: async (token) => {
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser(token);

		return { user, error };
	},
});

/**
 * Auth controller (Elysia instance)
 * Handles authentication routes
 */
export const auth = new Elysia({
	prefix: "/auth",
	name: "Auth.Controller",
})
	.use(authPlugin)
	.get("/me", ({ user }) => ({ user }));

// Re-export the auth plugin for use in other modules
export const authMiddleware = authPlugin;

// Re-export types for convenience
export type { AuthUser, GetUserFn, GetUserResult } from "./service";
