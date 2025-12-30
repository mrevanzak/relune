import * as z from "zod";
import { userSummarySchema } from "./users";

/**
 * Request/response schemas for sender mappings endpoints.
 */

// ============================================================================
// Input Schemas
// ============================================================================

export const upsertSenderMappingInput = z.object({
  externalName: z.string().min(1).max(200),
  mappedUserId: z.string().uuid(),
});

export const deleteSenderMappingInput = z.object({
  id: z.string().uuid(),
});

// ============================================================================
// Output Schemas
// ============================================================================

export const senderMappingSchema = z.object({
  id: z.string().uuid(),
  externalName: z.string(),
  mappedUser: userSummarySchema,
  createdAt: z.date(),
});

export const listSenderMappingsResultSchema = z.array(senderMappingSchema);

export const deleteSenderMappingResultSchema = z.object({
  success: z.literal(true),
});

// ============================================================================
// Type Exports
// ============================================================================

export type UpsertSenderMappingInput = z.infer<typeof upsertSenderMappingInput>;
export type DeleteSenderMappingInput = z.infer<typeof deleteSenderMappingInput>;

export type SenderMapping = z.infer<typeof senderMappingSchema>;
export type ListSenderMappingsResult = z.infer<
  typeof listSenderMappingsResultSchema
>;
export type DeleteSenderMappingResult = z.infer<
  typeof deleteSenderMappingResultSchema
>;
