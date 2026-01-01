import * as z from "zod";

/**
 * Request/response schemas for notifications endpoints.
 */

// ============================================================================
// Input Schemas
// ============================================================================

export const registerDeviceTokenInput = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});

export const sendNotificationInput = z.object({
  title: z.string(),
  body: z.string(),
  excludeUserId: z.string().uuid().optional(), // Don't notify this user (the actor)
});

// ============================================================================
// Type Exports
// ============================================================================

export type RegisterDeviceTokenInput = z.infer<typeof registerDeviceTokenInput>;
export type SendNotificationInput = z.infer<typeof sendNotificationInput>;
