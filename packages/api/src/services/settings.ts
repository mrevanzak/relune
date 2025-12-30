import { ORPCError } from "@orpc/server";
import { db } from "@relune/db";
import { userSettings } from "@relune/db/schema";
import { eq } from "drizzle-orm";

/**
 * Settings service - per-user preferences.
 */

export type Settings = {
  userId: string;
  autoArchiveDays: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getOrCreateSettings(userId: string): Promise<Settings> {
  await db
    .insert(userSettings)
    .values({
      userId,
      autoArchiveDays: null,
    })
    .onConflictDoNothing();

  const result = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const settings = result[0];
  if (!settings) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Failed to load settings",
      data: { code: "SETTINGS_NOT_FOUND" },
    });
  }

  return settings;
}

export async function updateSettings(input: {
  userId: string;
  autoArchiveDays: number | null;
}): Promise<Settings> {
  const now = new Date();

  const result = await db
    .insert(userSettings)
    .values({
      userId: input.userId,
      autoArchiveDays: input.autoArchiveDays,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        autoArchiveDays: input.autoArchiveDays,
        updatedAt: now,
      },
    })
    .returning();

  const settings = result[0];
  if (!settings) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Failed to update settings",
      data: { code: "SETTINGS_UPDATE_FAILED" },
    });
  }

  return settings;
}
