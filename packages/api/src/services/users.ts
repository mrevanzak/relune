import { db } from "@relune/db";
import { users } from "@relune/db/schema";
import { asc } from "drizzle-orm";

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
