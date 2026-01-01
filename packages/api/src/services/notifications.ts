import { ORPCError } from "@orpc/server";
import { db } from "@relune/db";
import { deviceTokens, users } from "@relune/db/schema";
import { and, eq, ne } from "drizzle-orm";

/**
 * Notifications service - handles device token registration and push notification sending.
 */

export interface DeviceTokenRecord {
  id: string;
  userId: string;
  token: string;
  platform: string;
}

/**
 * Register or update a device token for push notifications.
 * Uses upsert logic: if the token already exists for this user, update it.
 */
export async function registerDeviceToken(
  userId: string,
  token: string,
  platform: string
): Promise<DeviceTokenRecord> {
  // Try to find existing token for this user
  const existing = await db.query.deviceTokens.findFirst({
    where: and(eq(deviceTokens.userId, userId), eq(deviceTokens.token, token)),
  });

  if (existing) {
    // Update the existing record (touch updatedAt)
    const updated = await db
      .update(deviceTokens)
      .set({ platform, updatedAt: new Date() })
      .where(eq(deviceTokens.id, existing.id))
      .returning({
        id: deviceTokens.id,
        userId: deviceTokens.userId,
        token: deviceTokens.token,
        platform: deviceTokens.platform,
      });

    const record = updated[0];
    if (!record) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to update device token",
      });
    }
    return record;
  }

  // Insert new token
  const inserted = await db
    .insert(deviceTokens)
    .values({
      userId,
      token,
      platform,
    })
    .returning({
      id: deviceTokens.id,
      userId: deviceTokens.userId,
      token: deviceTokens.token,
      platform: deviceTokens.platform,
    });

  const record = inserted[0];
  if (!record) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Failed to register device token",
    });
  }
  return record;
}

/**
 * Remove a device token (e.g., on sign out).
 */
export async function removeDeviceToken(
  userId: string,
  token: string
): Promise<void> {
  await db
    .delete(deviceTokens)
    .where(and(eq(deviceTokens.userId, userId), eq(deviceTokens.token, token)));
}

/**
 * Get all device tokens except for a specific user (for broadcasting notifications).
 */
export async function getAllTokensExceptUser(
  excludeUserId?: string
): Promise<string[]> {
  const query = excludeUserId
    ? db
        .select({ token: deviceTokens.token })
        .from(deviceTokens)
        .where(ne(deviceTokens.userId, excludeUserId))
    : db.select({ token: deviceTokens.token }).from(deviceTokens);

  const results = await query;
  return results.map((r) => r.token);
}

/**
 * Get user's display name or email for notification messages.
 */
export async function getUserDisplayName(userId: string): Promise<string> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { displayName: true, email: true },
  });

  if (!user) return "Someone";
  if (user.displayName) return user.displayName;
  const emailPrefix = user.email.split("@")[0];
  return emailPrefix ?? user.email;
}

/**
 * Send push notifications using Expo's push notification service.
 *
 * @param tokens - Array of Expo push tokens
 * @param title - Notification title
 * @param body - Notification body
 * @returns Array of ticket IDs for sent notifications
 */
export async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string
): Promise<{ successCount: number; failureCount: number }> {
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  // Build messages for Expo push API
  const messages = tokens.map((token) => ({
    to: token,
    sound: "default" as const,
    title,
    body,
  }));

  // Expo recommends chunking in batches of 100
  const CHUNK_SIZE = 100;
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        console.error(
          "Expo push API error:",
          response.status,
          await response.text()
        );
        failureCount += chunk.length;
        continue;
      }

      const result = (await response.json()) as {
        data: Array<{ status: string; id?: string; message?: string }>;
      };

      // Count successes and failures
      for (const ticket of result.data) {
        if (ticket.status === "ok") {
          successCount++;
        } else {
          failureCount++;
          console.error("Push notification failed:", ticket.message);
        }
      }
    } catch (error) {
      console.error("Failed to send push notifications:", error);
      failureCount += chunk.length;
    }
  }

  return { successCount, failureCount };
}

/**
 * Broadcast a notification to all users except the actor.
 */
export async function broadcastNotification(
  excludeUserId: string,
  title: string,
  body: string
): Promise<{ successCount: number; failureCount: number }> {
  const tokens = await getAllTokensExceptUser(excludeUserId);
  return sendPushNotifications(tokens, title, body);
}
