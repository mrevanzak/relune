import { Elysia, t } from "elysia";
import JSZip from "jszip";
import { BadRequestError } from "../../shared/errors";
import { authMiddleware } from "../auth";
import * as ImportService from "./service";

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
		async ({ body }) => {
			const { file } = body;

			if (!file) {
				throw new BadRequestError("No file provided", "MISSING_FILE");
			}

			// Validate it's a zip file
			if (!file.name.endsWith(".zip") && file.type !== "application/zip") {
				throw new BadRequestError(
					"File must be a ZIP archive",
					"INVALID_FILE_TYPE",
				);
			}

			// Read zip file
			const zipBuffer = await file.arrayBuffer();
			const zipData = new Uint8Array(zipBuffer);

			// Use JSZip to extract contents
			const zip = await JSZip.loadAsync(zipData);

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
				throw new BadRequestError(
					"No _chat.txt found in ZIP archive",
					"MISSING_CHAT_TXT",
				);
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

					// Upload to storage
					const contentType = ImportService.getContentType(msg.filename);
					const uploadResult = await ImportService.uploadAudioToStorage(
						msg.filename,
						audioContent,
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
						fileSizeBytes: audioContent.length,
					});

					imported.push({ id: recordingId, filename: msg.filename });
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Unknown error";
					failed.push({ filename: msg.filename, error: errorMessage });
				}
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
			body: t.Object({
				file: t.File(),
			}),
		},
	);
