import { db } from "@relune/db";
import { users } from "@relune/db/schema";
import { eq } from "drizzle-orm";

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
 *
 * If a "shadow" user exists with the same email but different ID,
 * migrates the shadow user's ID to the real Supabase Auth ID.
 * This preserves all foreign key references (recordings.senderId, etc.).
 */
export async function ensureUserExists(user: AuthUser): Promise<void> {
  const email = user.email?.trim().toLowerCase();

  if (!email) {
    // No email - just try to insert with ID conflict check
    await db
      .insert(users)
      .values({ id: user.id, email: "" })
      .onConflictDoNothing();
    return;
  }

  // Check if a user with this email already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    if (existingUser.id !== user.id) {
      // Shadow user exists with different ID - migrate to real Supabase Auth ID
      // This preserves all foreign key references (recordings.senderId, senderMappings.mappedUserId)
      await db
        .update(users)
        .set({ id: user.id })
        .where(eq(users.id, existingUser.id));
    }
    // else: same ID, user already exists correctly - nothing to do
  } else {
    // No existing user with this email - create new
    await db.insert(users).values({ id: user.id, email }).onConflictDoNothing(); // Safety for race conditions on ID
  }
}
