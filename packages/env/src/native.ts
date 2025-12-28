import { createEnv } from "@t3-oss/env-core";
import Constants from "expo-constants";
import { clientSchema } from "./shared";

/**
 * Get client env from Expo's extra config.
 * Falls back to manifest.extra if expoConfig is not available.
 */
function getClientEnvFromExpo() {
  const extra = Constants.expoConfig?.extra;
  if (extra && typeof extra === "object") return extra;

  throw new Error(
    "clientEnv not found in Expo config. Make sure app.config.ts injects clientEnv into extra."
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
