import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Factory function to create validated environment variables.
 * Use this when you need to control when validation happens (e.g., after dotenv.config).
 */
export function createReluneEnv(runtimeEnv = process.env) {
	return createEnv({
		server: {
			DATABASE_URL: z.string().url(),
			SUPABASE_URL: z.string().url(),
			SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
			ALLOWED_EMAILS: z
				.string()
				.default("")
				.transform((val) =>
					val
						.split(",")
						.map((item) => item.trim())
						.filter(Boolean),
				),
			CORS_ORIGIN: z.string().default(""),
			ENABLE_SWAGGER: z
				.string()
				.default("false")
				.transform((val) => val === "true"),
		},
		runtimeEnv,
		emptyStringAsUndefined: true,
	});
}

/**
 * Validated environment variables for server-side use.
 * Import this in your application code.
 */
export const env = createReluneEnv(process.env);
