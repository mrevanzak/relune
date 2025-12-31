import * as z from "zod";

/**
 * Request/response schemas for import endpoints.
 */

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Upload a WhatsApp export ZIP file to temporary storage.
 * Returns a fileRef that can be used for preview and import.
 */
export const whatsappUploadInput = z.object({
  file: z.string().min(1, "File is required"), // base64-encoded ZIP file
});

/**
 * Preview a previously uploaded WhatsApp export.
 * Use the fileRef returned from whatsappUpload.
 */
export const whatsappPreviewInput = z.object({
  fileRef: z.string().min(1, "File reference is required"),
});

/**
 * Import recordings from a previously uploaded WhatsApp export.
 * Use the fileRef returned from whatsappUpload.
 */
export const whatsappImportInput = z.object({
  fileRef: z.string().min(1, "File reference is required"),
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

export type WhatsappUploadInput = z.infer<typeof whatsappUploadInput>;
export type WhatsappPreviewInput = z.infer<typeof whatsappPreviewInput>;
export type WhatsappImportInput = z.infer<typeof whatsappImportInput>;
export type ImportResult = z.infer<typeof importResultSchema>;
