import fs from "node:fs";
import path from "node:path";
import { createEnv } from "@t3-oss/env-core";
import dotenv from "dotenv";
import { z } from "zod";

function findNearestDotenvFile(startDir: string): string | null {
	let dir = startDir;

	for (let i = 0; i < 25; i++) {
		const candidate = path.join(dir, ".env");
		if (fs.existsSync(candidate)) {
			return candidate;
		}

		const parent = path.dirname(dir);
		if (parent === dir) {
			return null;
		}

		dir = parent;
	}

	return null;
}

function loadDotenvOnce(): void {
	// Avoid loading `.env` multiple times across packages.
	if (process.env.RELUNE_DOTENV_LOADED === "true") {
		return;
	}

	// Allow overriding the resolved path for debugging/CI.
	const explicitPath = process.env.RELUNE_DOTENV_PATH;
	const dotenvPath =
		explicitPath && explicitPath.length > 0
			? explicitPath
			: findNearestDotenvFile(process.cwd());

	if (dotenvPath) {
		const result = dotenv.config({ path: dotenvPath });
		if (result.error) {
			throw new Error(
				`Failed to load .env from ${dotenvPath}: ${result.error.message}`,
			);
		}
	}

	process.env.RELUNE_DOTENV_LOADED = "true";
}

/**
 * Factory function to create validated environment variables.
 * Use this when you need to control when validation happens (e.g., after dotenv.config).
 */
export function createReluneEnv(runtimeEnv = process.env) {
	return createEnv({
		server: {
			DATABASE_URL: z.url(),
			SUPABASE_URL: z.url(),
			SUPABASE_KEY: z.string().min(1),
			OPENAI_API_KEY: z.string().min(1),
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
loadDotenvOnce();
export const env = createReluneEnv(process.env);
