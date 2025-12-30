import * as z from "zod";

/**
 * Request/response schemas for import endpoints.
 */

// ============================================================================
// Input Schemas
// ============================================================================

export const whatsappPreviewInput = z.object({
  file: z.string().min(1, "File is required"), // base64-encoded ZIP file
});

export const whatsappImportInput = z.object({
  file: z.string().min(1, "File is required"), // base64-encoded ZIP file
  senderMappings: z.record(z.string(), z.string()).optional(), // externalName → userId
  saveMappings: z.boolean().optional().default(false), // Whether to save mappings for future use
});

// ============================================================================
// Output Schemas
// ============================================================================

export const importResultSchema = z.object({
  imported: z.number(),
  skipped: z.number(),
  failed: z.array(
    z.object({
      filename: z.string(),
      error: z.string(),
    })
  ),
  parseErrors: z.array(z.string()),
  recordings: z.array(
    z.object({
      id: z.string(),
      filename: z.string(),
    })
  ),
});

// ============================================================================
// Type Exports
// ============================================================================

export type WhatsappPreviewInput = z.infer<typeof whatsappPreviewInput>;
export type WhatsappImportInput = z.infer<typeof whatsappImportInput>;
export type ImportResult = z.infer<typeof importResultSchema>;
