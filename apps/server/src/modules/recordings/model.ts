import { t } from "elysia";

/**
 * Request/response schemas for recordings endpoints
 */

export const listQuerySchema = t.Object({
	limit: t.Optional(t.String()),
	offset: t.Optional(t.String()),
});

export const recordingIdParamSchema = t.Object({
	id: t.String(),
});

// Type exports for use in services/controllers
export type ListQuery = typeof listQuerySchema.static;
export type RecordingIdParam = typeof recordingIdParamSchema.static;
