import * as z from "zod";

/**
 * Request/response schemas for users endpoints.
 */

// ============================================================================
// Input Schemas
// ============================================================================

export const createUserInput = z.object({
  email: z.string().email(),
  displayName: z.string().max(200).optional(),
});

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

export type CreateUserInput = z.infer<typeof createUserInput>;
export type UserSummary = z.infer<typeof userSummarySchema>;
export type ListUsersResult = z.infer<typeof listUsersResultSchema>;
