"use strict";
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const APP_ENV = process.env.APP_ENV ?? "development";

function findDotenvFile(startDir) {
  let dir = startDir;

  for (let i = 0; i < 25; i++) {
    const envSpecificCandidate = path.join(dir, `.env.${APP_ENV}`);
    if (fs.existsSync(envSpecificCandidate)) {
      return envSpecificCandidate;
    }

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

function loadDotenvForExpo() {
  const explicitPath = process.env.RELUNE_DOTENV_PATH;
  const dotenvPath =
    explicitPath && explicitPath.length > 0
      ? explicitPath
      : findDotenvFile(process.cwd());

  if (!dotenvPath) {
    return;
  }

  const result = dotenv.config({ path: dotenvPath });
  if (result.error) {
    throw new Error(
      `Failed to load .env from ${dotenvPath}: ${result.error.message}`
    );
  }
}

function buildClientEnvInput(runtimeEnv) {
  return {
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      runtimeEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      runtimeEnv.SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_SUPABASE_URL:
      runtimeEnv.EXPO_PUBLIC_SUPABASE_URL ?? runtimeEnv.SUPABASE_URL,
    EXPO_PUBLIC_API_URL: runtimeEnv.EXPO_PUBLIC_API_URL,
  };
}

loadDotenvForExpo();

module.exports = {
  clientEnv: buildClientEnvInput(process.env),
  buildClientEnvInput,
};
