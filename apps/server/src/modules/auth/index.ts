import { env } from "@relune/env";
import { Elysia, t } from "elysia";
import { supabase } from "@/shared/supabase";
import { errorResponseSchema } from "../../shared/errors";
import { createAuthPlugin } from "./service";

const allowedEmails = env.ALLOWED_EMAILS;

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
 * Response schema for auth user
 */
const authUserSchema = t.Object({
	id: t.String(),
	email: t.Optional(t.Nullable(t.String())),
});

const getMeResponseSchema = t.Object({
	user: authUserSchema,
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
	.get("/me", ({ user }) => ({ user }), {
		response: {
			200: getMeResponseSchema,
			401: errorResponseSchema,
			403: errorResponseSchema,
		},
	});

// Re-export the auth plugin for use in other modules
export const authMiddleware = authPlugin;

// Re-export types for convenience
export type { AuthUser, GetUserFn, GetUserResult } from "./service";
