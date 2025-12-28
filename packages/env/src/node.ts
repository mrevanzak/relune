import fs from "node:fs";
import path from "node:path";
import { createEnv } from "@t3-oss/env-core";
import dotenv from "dotenv";
import { serverSchema } from "./shared";

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
        `Failed to load .env from ${dotenvPath}: ${result.error.message}`
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
    server: serverSchema,
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
