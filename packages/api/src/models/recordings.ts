import * as z from "zod";

/**
 * Request/response schemas for recordings endpoints.
 * These are the source of truth for API types.
 */

// ============================================================================
// Input Schemas
// ============================================================================

export const listRecordingsInput = z
  .object({
    limit: z.number().optional(),
    offset: z.number().optional(),
    search: z.string().optional(),
    tab: z.enum(["current", "archived"]).optional(),
  })
  .optional();

export const getRecordingInput = z.object({
  id: z.string().uuid(),
});

export const createRecordingInput = z.object({
  file: z.string().min(1, "File is required"), // base64-encoded audio data
  filename: z.string().min(1, "Filename is required"),
  durationSeconds: z.number().positive().optional(),
  recordedAt: z.date().optional(),
});

export const updateRecordingInput = z.object({
  id: z.string().uuid(),
  recordedAt: z.string().datetime().optional(),
  keywords: z.array(z.string()).optional(),
});

export const deleteRecordingInput = z.object({
  id: z.string().uuid(),
});

export const processPendingInput = z.object({
  limit: z.number().int().min(1).max(50).optional().default(10),
});

// ============================================================================
// Output Schemas
// ============================================================================

export const keywordSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const recordingSchema = z.object({
  id: z.string(),
  userId: z.string(),
  senderId: z.string().uuid().nullable(),
  audioUrl: z.string(),
  transcript: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  fileSizeBytes: z.number().nullable(),
  recordedAt: z.date(),
  language: z.enum(["en", "fr", "mixed"]).nullable(),
  importSource: z.enum(["app", "whatsapp"]),
  originalFilename: z.string().nullable(),
  notes: z.string().nullable(),
  isArchived: z.boolean(),
  archivedAt: z.date().nullable(),
  importedAt: z.date().nullable(),
  importedById: z.string().uuid().nullable(),
  senderName: z.string().nullable(),
  importedByName: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const recordingWithKeywordsSchema = recordingSchema.extend({
  keywords: z.array(keywordSchema),
});

export const processPendingResultSchema = z.object({
  processed: z.number(),
  remaining: z.number(),
  errors: z.array(
    z.object({
      id: z.string(),
      error: z.string(),
    })
  ),
});

// ============================================================================
// Type Exports
// ============================================================================

export type ListRecordingsInput = z.infer<typeof listRecordingsInput>;
export type GetRecordingInput = z.infer<typeof getRecordingInput>;
export type CreateRecordingInput = z.infer<typeof createRecordingInput>;
export type UpdateRecordingInput = z.infer<typeof updateRecordingInput>;
export type DeleteRecordingInput = z.infer<typeof deleteRecordingInput>;
export type ProcessPendingInput = z.infer<typeof processPendingInput>;

export type Keyword = z.infer<typeof keywordSchema>;
export type Recording = z.infer<typeof recordingSchema>;
export type RecordingWithKeywords = z.infer<typeof recordingWithKeywordsSchema>;
export type ProcessPendingResult = z.infer<typeof processPendingResultSchema>;
