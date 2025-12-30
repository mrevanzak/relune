import { ORPCError } from "@orpc/server";
import { fileTypeFromBuffer } from "file-type";
import JSZip from "jszip";

import { protectedProcedure } from "../index";
import { whatsappImportInput, whatsappPreviewInput } from "../models/import";
import { convertToM4a, needsConversion } from "../services/audio-converter";
import * as ImportService from "../services/import";
import * as RecordingsService from "../services/recordings";
import * as SenderMappingsService from "../services/sender-mappings";
import { getContentType, uploadAudioToStorage } from "../services/storage";

/**
 * Import Router
 *
 * Handles importing recordings from external sources.
 * Currently supports WhatsApp chat export ZIP files.
 */
export const importRouter = {
  /**
   * Preview a WhatsApp chat export ZIP file.
   * Returns the unique sender names found in the chat without importing.
   *
   * @throws BAD_REQUEST if file is not a ZIP or missing _chat.txt
   */
  whatsappPreview: protectedProcedure
    .input(whatsappPreviewInput)
    .handler(async ({ input }) => {
      const { file } = input;

      // Convert base64 string to buffer
      const fileBuffer = Buffer.from(file, "base64");

      // Validate it's a zip file
      const fileType = await fileTypeFromBuffer(fileBuffer);
      if (fileType?.mime !== "application/zip") {
        throw new ORPCError("BAD_REQUEST", {
          message: "File must be a ZIP archive",
          data: { code: "INVALID_FILE_TYPE" },
        });
      }

      // Extract ZIP contents
      const zip = await JSZip.loadAsync(fileBuffer);

      // Find _chat.txt
      let chatTxtContent: string | null = null;
      let audioFileCount = 0;

      for (const [filename, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;

        const baseName = filename.split("/").pop() || filename;

        if (baseName === "_chat.txt") {
          chatTxtContent = await zipEntry.async("string");
        } else if (
          baseName.match(/\.(opus|m4a|mp3|wav|ogg)$/i) &&
          !baseName.startsWith(".")
        ) {
          audioFileCount++;
        }
      }

      if (!chatTxtContent) {
        throw new ORPCError("BAD_REQUEST", {
          message: "No _chat.txt found in ZIP archive",
          data: { code: "MISSING_CHAT_TXT" },
        });
      }

      // Parse chat.txt
      const { audioMessages, errors: parseErrors } =
        ImportService.parseChatTxt(chatTxtContent);

      // Extract unique sender names
      const senderNames = [...new Set(audioMessages.map((m) => m.sender))];

      // Count messages per sender
      const senderCounts: Record<string, number> = {};
      for (const msg of audioMessages) {
        senderCounts[msg.sender] = (senderCounts[msg.sender] ?? 0) + 1;
      }

      return {
        senderNames,
        senderCounts,
        totalAudioFiles: audioFileCount,
        totalParsedMessages: audioMessages.length,
        parseErrors,
      };
    }),
  /**
   * Import recordings from a WhatsApp chat export ZIP file.
   *
   * The ZIP file should contain:
   * - _chat.txt: WhatsApp chat export file
   * - Audio files (.opus, .m4a, .mp3, .wav, .ogg)
   *
   * Process:
   * 1. Validate ZIP file
   * 2. Parse _chat.txt for audio message metadata
   * 3. For each audio message:
   *    - Resolve/create user by display name
   *    - Check for duplicates
   *    - Convert audio to m4a if needed
   *    - Upload to storage
   *    - Create recording in database
   * 4. Trigger transcription for imported recordings
   *
   * @throws BAD_REQUEST if file is not a ZIP or missing _chat.txt
   *
   * @example
   * ```typescript
   * const result = await client.import.whatsapp({ file: base64ZipData });
   * console.log(`Imported ${result.imported} recordings`);
   * ```
   */
  whatsapp: protectedProcedure
    .input(whatsappImportInput)
    .handler(async ({ input, context }) => {
      const { file, senderMappings, saveMappings } = input;
      const importerId = context.user.id;

      // Convert base64 string to buffer
      const fileBuffer = Buffer.from(file, "base64");

      // Validate it's a zip file
      const fileType = await fileTypeFromBuffer(fileBuffer);
      if (fileType?.mime !== "application/zip") {
        throw new ORPCError("BAD_REQUEST", {
          message: "File must be a ZIP archive",
          data: { code: "INVALID_FILE_TYPE" },
        });
      }

      // Extract ZIP contents
      const zip = await JSZip.loadAsync(fileBuffer);

      // Find _chat.txt and audio files
      let chatTxtContent: string | null = null;
      const audioFiles = new Map<string, Uint8Array>();

      for (const [filename, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;

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
        throw new ORPCError("BAD_REQUEST", {
          message: "No _chat.txt found in ZIP archive",
          data: { code: "MISSING_CHAT_TXT" },
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
      // Track which senders we've saved mappings for
      const savedMappings = new Set<string>();

      for (const msg of audioMessages) {
        try {
          // Resolve user from sender mappings or fall back to resolveOrCreateUser
          let userId = userCache.get(msg.sender);
          let senderId: string | undefined;

          if (userId) {
            // User was cached, use the cached userId as senderId
            senderId = userId;
          } else {
            // Check if sender mapping was provided
            const mappedUserId = senderMappings?.[msg.sender];
            if (mappedUserId) {
              userId = mappedUserId;
              senderId = mappedUserId;
            } else {
              userId = await ImportService.resolveOrCreateUser(msg.sender);
              senderId = userId;
            }
            userCache.set(msg.sender, userId);

            // Save mapping if requested and not already saved
            if (
              saveMappings &&
              mappedUserId &&
              !savedMappings.has(msg.sender)
            ) {
              await SenderMappingsService.upsertSenderMapping({
                userId: importerId,
                externalName: msg.sender,
                mappedUserId,
              });
              savedMappings.add(msg.sender);
            }
          }

          // Check for duplicate
          const isDupe = await ImportService.checkDuplicate(
            userId,
            msg.filename
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

          // Convert to m4a if needed
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
            contentType
          );

          if (uploadResult.error) {
            failed.push({
              filename: msg.filename,
              error: `Upload failed: ${uploadResult.error}`,
            });
            continue;
          }

          // Create recording with sender and importer info
          const recordingId = await ImportService.createImportedRecording({
            userId,
            audioUrl: uploadResult.url,
            recordedAt: msg.timestamp,
            originalFilename: msg.filename,
            notes: msg.notes,
            fileSizeBytes: finalContent.length,
            senderId,
            importedById: importerId,
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
            console.error("Transcription failed for imported recordings:", err)
        );
      }

      return {
        imported: imported.length,
        skipped: skipped.length,
        failed,
        parseErrors,
        recordings: imported,
      };
    }),
};
