import { t } from "elysia";

/**
 * Request/response schemas for import endpoints
 */

/**
 * Schema for WhatsApp import request body
 * Client sends zip file as base64-encoded string
 */
export const whatsappImportBodySchema = t.Object({
	file: t.String(), // base64-encoded ZIP file
});

export type WhatsappImportBody = typeof whatsappImportBodySchema.static;
