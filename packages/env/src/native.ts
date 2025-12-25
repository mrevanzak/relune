import { createEnv } from "@t3-oss/env-core";
import Constants from "expo-constants";
import { clientSchema } from "./shared";

/**
 * Get client env from Expo's extra config.
 * Falls back to manifest.extra if expoConfig is not available.
 */
function getClientEnvFromExpo(): Record<string, string | undefined> {
	const extra = Constants.expoConfig?.extra?.clientEnv;
	if (extra && typeof extra === "object") {
		return extra as Record<string, string | undefined>;
	}

	// Fallback to manifest (for bare workflow or older Expo versions)
	const manifestExtra = Constants.manifest?.extra?.clientEnv;
	if (manifestExtra && typeof manifestExtra === "object") {
		return manifestExtra as Record<string, string | undefined>;
	}

	throw new Error(
		"clientEnv not found in Expo config. Make sure app.config.ts injects clientEnv into extra.",
	);
}

/**
 * Validated client-only environment variables for React Native.
 * This module has no Node imports and is safe to bundle with Metro.
 */
const clientEnvInput = getClientEnvFromExpo();

export const env = createEnv({
	clientPrefix: "EXPO_PUBLIC_",
	client: clientSchema,
	runtimeEnv: clientEnvInput,
	emptyStringAsUndefined: true,
	isServer: false,
});
