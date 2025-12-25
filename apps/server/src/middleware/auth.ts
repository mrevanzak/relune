import { createClient, type User } from "@supabase/supabase-js";
import { Elysia } from "elysia";

const supabase = createClient(
	process.env.SUPABASE_URL || "",
	process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

const WHITELIST = (process.env.ALLOWED_EMAILS || "").split(",").filter(Boolean);

export const auth = new Elysia({ name: "auth" })
	.derive({ as: "scoped" }, async ({ request, set }) => {
		const authHeader = request.headers.get("Authorization");
		if (!authHeader) {
			set.status = 401;
			throw new Error("No authorization header");
		}

		const token = authHeader.replace("Bearer ", "");
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser(token);

		if (authError || !user) {
			set.status = 401;
			throw new Error("Invalid token");
		}

		if (WHITELIST.length > 0 && !WHITELIST.includes(user.email || "")) {
			set.status = 403;
			throw new Error("Email not authorized");
		}

		return { user: user as User };
	})
	.as("scoped");
