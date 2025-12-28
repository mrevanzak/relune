// packages/api/src/middleware/auth.ts
import { ORPCError, os } from "@orpc/server";

import type { AuthUser, BaseContext } from "../context";
import { ensureUserExists } from "../context";
import { validateToken } from "../services/supabase";

/**
 * Configuration for auth middleware.
 */
export interface AuthMiddlewareConfig {
  /** List of allowed email addresses. If empty, all authenticated users are allowed. */
  allowedEmails?: string[];
}

// Pre-compiled regex at module level for performance
const BEARER_TOKEN_REGEX = /^Bearer\s+(.+)$/i;

/**
 * Normalize email for comparison (lowercase, trimmed).
 */
function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ?? null;
}

/**
 * Extract Bearer token from Authorization header.
 */
function extractBearerToken(headers: Headers): string | null {
  const authHeader = headers.get("Authorization");
  if (!authHeader) {
    return null;
  }

  const bearerMatch = BEARER_TOKEN_REGEX.exec(authHeader);
  if (!bearerMatch) {
    return null;
  }

  return bearerMatch[1]?.trim() ?? null;
}

/**
 * Check if user email is authorized against allowlist.
 */
function isEmailAuthorized(
  userEmail: string | undefined,
  whitelist: string[]
): boolean {
  if (whitelist.length === 0) {
    return true;
  }
  const normalizedEmail = normalizeEmail(userEmail);
  if (!normalizedEmail) {
    return false;
  }
  return whitelist.includes(normalizedEmail);
}

/**
 * Auth middleware that validates Supabase Bearer tokens.
 *
 * Extracts the token from Authorization header, validates with Supabase,
 * and adds the authenticated user to context.
 *
 * @throws ORPCError with code "UNAUTHORIZED" if token is missing or invalid
 * @throws ORPCError with code "FORBIDDEN" if user email is not in allowlist
 */
export function authMiddleware(config: AuthMiddlewareConfig = {}) {
  const { allowedEmails = [] } = config;
  const whitelist = allowedEmails
    .map((email) => normalizeEmail(email))
    .filter((email): email is string => Boolean(email));

  return os.$context<BaseContext>().middleware(async ({ context, next }) => {
    const token = extractBearerToken(context.headers);

    if (!token) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "No authorization header or invalid Bearer token format",
        data: { code: "MISSING_TOKEN" },
      });
    }

    const { user, error } = await validateToken(token);

    if (error || !user) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Invalid token",
        data: { code: "INVALID_TOKEN" },
      });
    }

    // Check email allowlist if configured
    if (!isEmailAuthorized(user.email, whitelist)) {
      throw new ORPCError("FORBIDDEN", {
        message: "Email not authorized",
        data: { code: "EMAIL_NOT_ALLOWED" },
      });
    }

    // Ensure user exists in public.users table (just-in-time provisioning)
    await ensureUserExists(user);

    return next({
      context: { user } as { user: AuthUser },
    });
  });
}
