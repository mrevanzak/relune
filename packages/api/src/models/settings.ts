import * as z from "zod";

/**
 * Request/response schemas for user settings endpoints.
 */

// ============================================================================
// Input Schemas
// ============================================================================

export const updateSettingsInput = z.object({
  autoArchiveDays: z.number().int().min(1).max(365).nullable(),
});

// ============================================================================
// Output Schemas
// ============================================================================

export const settingsSchema = z.object({
  userId: z.string().uuid(),
  autoArchiveDays: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type UpdateSettingsInput = z.infer<typeof updateSettingsInput>;
export type Settings = z.infer<typeof settingsSchema>;
