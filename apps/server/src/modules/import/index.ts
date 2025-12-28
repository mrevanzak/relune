import { Elysia, t } from "elysia";
import { fileTypeFromBuffer } from "file-type";
import JSZip from "jszip";
import { convertToM4a, needsConversion } from "@/shared/audio-converter";
import { errorResponseSchema } from "../../shared/errors";
import { getContentType, uploadAudioToStorage } from "../../shared/storage";
import { authMiddleware } from "../auth";
import * as RecordingsService from "../recordings/service";
import { whatsappImportBodySchema } from "./model";
import * as ImportService from "./service";

/**
 * Response schema for import result
 */
const importResultSchema = t.Object({
	imported: t.Number(),
	skipped: t.Number(),
	failed: t.Array(
		t.Object({
			filename: t.String(),
			error: t.String(),
		}),
	),
	parseErrors: t.Array(t.String()),
	recordings: t.Array(
		t.Object({
			id: t.String(),
			filename: t.String(),
		}),
	),
});

/**
 * Import controller (Elysia instance)
 * Handles WhatsApp chat export imports
 */

export const importRoutes = new Elysia({
	prefix: "/import",
	name: "Import.Controller",
})
	.use(authMiddleware)
	.post(
		"/whatsapp",
		async ({ body, status }) => {
			const { file } = body;

			// Convert base64 string to buffer
			const fileBuffer = Buffer.from(file, "base64");

			// Validate it's a zip file
			const fileType = await fileTypeFromBuffer(fileBuffer);
			if (fileType?.mime !== "application/zip") {
				return status(400, {
					message: "File must be a ZIP archive",
					code: "INVALID_FILE_TYPE",
					status: 400,
				});
			}

			// Use JSZip to extract contents
			const zip = await JSZip.loadAsync(fileBuffer);

			// Find _chat.txt and audio files
			let chatTxtContent: string | null = null;
			const audioFiles = new Map<string, Uint8Array>();

			for (const [filename, zipEntry] of Object.entries(zip.files)) {
				if (zipEntry.dir) continue;

				// Get the base filename (ignore folder structure)
				const baseName = filename.split("/").pop() || filename;

				if (baseName === "_chat.txt") {
					chatTxtContent = await zipEntry.async("string");
				} else if (
					baseName.match(/\.(opus|m4a|mp3|wav|ogg)$/i) &&
					!baseName.startsWith(".")
				) {
					const content = await zipEntry.async("uint8array");
					audioFiles.set(baseName, content);
				}
			}

			if (!chatTxtContent) {
				return status(400, {
					message: "No _chat.txt found in ZIP archive",
					code: "MISSING_CHAT_TXT",
					status: 400,
				});
			}

			// Parse chat.txt
			const { audioMessages, errors: parseErrors } =
				ImportService.parseChatTxt(chatTxtContent);

			// Process each audio message
			const imported: Array<{ id: string; filename: string }> = [];
			const skipped: string[] = [];
			const failed: Array<{ filename: string; error: string }> = [];

			// Cache user IDs to avoid repeated lookups
			const userCache = new Map<string, string>();

			for (const msg of audioMessages) {
				try {
					// Resolve user
					let userId = userCache.get(msg.sender);
					if (!userId) {
						userId = await ImportService.resolveOrCreateUser(msg.sender);
						userCache.set(msg.sender, userId);
					}

					// Check for duplicate
					const isDupe = await ImportService.checkDuplicate(
						userId,
						msg.filename,
					);
					if (isDupe) {
						skipped.push(msg.filename);
						continue;
					}

					// Find audio file in zip
					const audioContent = audioFiles.get(msg.filename);
					if (!audioContent) {
						failed.push({
							filename: msg.filename,
							error: "Audio file not found in ZIP",
						});
						continue;
					}

					// Convert to m4a if needed (opus, ogg, wav, etc.)
					let finalContent = audioContent;
					let finalFilename = msg.filename;
					if (needsConversion(msg.filename)) {
						const converted = await convertToM4a(audioContent, msg.filename);
						finalContent = converted.data;
						finalFilename = converted.filename;
					}

					// Upload to storage
					const contentType = getContentType(finalFilename);
					const uploadResult = await uploadAudioToStorage(
						finalFilename,
						finalContent,
						contentType,
					);

					if (uploadResult.error) {
						failed.push({
							filename: msg.filename,
							error: `Upload failed: ${uploadResult.error}`,
						});
						continue;
					}

					// Create recording
					const recordingId = await ImportService.createRecording({
						userId,
						audioUrl: uploadResult.url,
						recordedAt: msg.timestamp,
						originalFilename: msg.filename,
						notes: msg.notes,
						fileSizeBytes: finalContent.length,
					});

					imported.push({ id: recordingId, filename: msg.filename });
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Unknown error";
					failed.push({ filename: msg.filename, error: errorMessage });
				}
			}

			// Trigger transcription for all imported recordings (fire-and-forget)
			if (imported.length > 0) {
				RecordingsService.processPendingRecordings(imported.length).catch(
					(err) =>
						console.error("Transcription failed for imported recordings:", err),
				);
			}

			return {
				imported: imported.length,
				skipped: skipped.length,
				failed,
				parseErrors,
				recordings: imported,
			};
		},
		{
			body: whatsappImportBodySchema,
			parse: "json",
			response: {
				200: importResultSchema,
				400: errorResponseSchema,
			},
		},
	);
