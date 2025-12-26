import { t } from "elysia";

/**
 * Request/response schemas for recordings endpoints
 */

export const listQuerySchema = t.Object({
	limit: t.Optional(t.Number()),
	offset: t.Optional(t.Number()),
});

export const recordingIdParamSchema = t.Object({
	id: t.String(),
});

export const processPendingQuerySchema = t.Object({
	limit: t.Optional(t.String()),
});

/**
 * Schema for creating a new recording via file upload
 */
export const createRecordingBodySchema = t.Object({
	file: t.File(),
	durationSeconds: t.Optional(t.Numeric()),
	recordedAt: t.Optional(t.String()), // ISO 8601 string
});

// Type exports for use in services/controllers
export type ListRecordingsParam = typeof listQuerySchema.static;
export type RecordingIdParam = typeof recordingIdParamSchema.static;
export type ProcessPendingQuery = typeof processPendingQuerySchema.static;
export type CreateRecordingBody = typeof createRecordingBodySchema.static;
