import { ORPCError } from "@orpc/server";
import { db } from "@relune/db";
import { users } from "@relune/db/schema";
import { asc, eq } from "drizzle-orm";

/**
 * Users service - read-only access to user accounts for UI (e.g. mapping dropdowns).
 */

export type UserSummary = {
  id: string;
  email: string;
  displayName: string | null;
};

export async function listUsers(): Promise<UserSummary[]> {
  return await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(users)
    .orderBy(asc(users.createdAt));
}

/**
 * Create a new "shadow" user (not tied to Supabase Auth).
 * Used for mapping imported recordings to people who haven't signed up yet.
 *
 * @throws ORPCError BAD_REQUEST if email already exists
 */
export async function createUser(input: {
  email: string;
  displayName?: string;
}): Promise<UserSummary> {
  const email = input.email.trim().toLowerCase();

  // Check if email already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    throw new ORPCError("BAD_REQUEST", {
      message: "A user with this email already exists",
      data: { code: "EMAIL_EXISTS" },
    });
  }

  // Generate random UUID for shadow user
  const id = crypto.randomUUID();

  const [newUser] = await db
    .insert(users)
    .values({
      id,
      email,
      displayName: input.displayName?.trim() || null,
    })
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    });

  if (!newUser) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Failed to create user",
      data: { code: "USER_CREATE_FAILED" },
    });
  }

  return newUser;
}
