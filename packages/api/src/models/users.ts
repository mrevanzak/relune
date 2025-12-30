import * as z from "zod";

/**
 * Request/response schemas for users endpoints.
 */

// ============================================================================
// Output Schemas
// ============================================================================

export const userSummarySchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  displayName: z.string().nullable(),
});

export const listUsersResultSchema = z.array(userSummarySchema);

// ============================================================================
// Type Exports
// ============================================================================

export type UserSummary = z.infer<typeof userSummarySchema>;
export type ListUsersResult = z.infer<typeof listUsersResultSchema>;
