import { db } from "@relune/db";
import { users } from "@relune/db/schema";

/**
 * Base context available to all procedures.
 * Contains headers for auth extraction.
 */
export interface BaseContext {
  headers: Headers;
}

/**
 * Authenticated user info derived by auth middleware.
 */
export interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Context after auth middleware has run.
 * User is guaranteed to be present.
 */
export type AuthenticatedContext = BaseContext & {
  user: AuthUser;
};

/**
 * Create base context from request headers.
 * Called by the server for each request.
 */
export function createContext(headers: Headers): BaseContext {
  return { headers };
}

export type Context = BaseContext;

/**
 * Ensure user exists in the public.users table.
 * Creates the user row if it doesn't exist (just-in-time provisioning).
 * Uses onConflictDoNothing to handle concurrent requests safely.
 */
export async function ensureUserExists(user: AuthUser): Promise<void> {
  await db
    .insert(users)
    .values({
      id: user.id,
      email: user.email ?? "",
    })
    .onConflictDoNothing();
}
