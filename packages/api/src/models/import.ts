import { z } from "zod";

/**
 * Request/response schemas for import endpoints.
 */

// ============================================================================
// Input Schemas
// ============================================================================

export const whatsappImportInput = z.object({
  file: z.string().min(1, "File is required"), // base64-encoded ZIP file
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

export type WhatsappImportInput = z.infer<typeof whatsappImportInput>;
export type ImportResult = z.infer<typeof importResultSchema>;
