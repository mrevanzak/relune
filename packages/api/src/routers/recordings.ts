import { protectedProcedure } from "../index";
import {
  createRecordingInput,
  deleteRecordingInput,
  getRecordingInput,
  listRecordingsInput,
  processPendingInput,
  updateRecordingInput,
} from "../models/recordings";
import * as NotificationsService from "../services/notifications";
import * as RecordingsService from "../services/recordings";

/**
 * Recordings Router
 *
 * All endpoints require authentication (protectedProcedure).
 *
 * Endpoints:
 * - list: Get paginated recordings with optional search
 * - get: Get single recording by ID
 * - create: Upload new recording (base64 audio)
 * - update: Update recording metadata (recordedAt, keywords)
 * - delete: Delete recording and audio file
 * - processPending: Trigger transcription for pending recordings
 */
export const recordingsRouter = {
  /**
   * List recordings with optional search and pagination.
   *
   * @example
   * ```typescript
   * const recordings = await client.recordings.list({ limit: 20, search: "meeting" });
   * ```
   */
  list: protectedProcedure
    .input(listRecordingsInput)
    .handler(({ input, context }) =>
      RecordingsService.listRecordings({
        userId: context.user.id,
        limit: input?.limit,
        offset: input?.offset,
        search: input?.search,
        tab: input?.tab,
      })
    ),

  /**
   * Get a single recording by ID.
   *
   * @throws NOT_FOUND if recording doesn't exist
   *
   * @example
   * ```typescript
   * const recording = await client.recordings.get({ id: "uuid" });
   * ```
   */
  get: protectedProcedure
    .input(getRecordingInput)
    .handler(async ({ input }) => RecordingsService.getRecording(input.id)),

  /**
   * Create a new recording from uploaded audio.
   * Accepts base64-encoded audio data.
   * Automatically converts opus/ogg to m4a for iOS compatibility.
   * Triggers transcription in background.
   *
   * @throws BAD_REQUEST if upload fails
   *
   * @example
   * ```typescript
   * const recording = await client.recordings.create({
   *   file: base64Audio,
   *   filename: "recording.m4a",
   *   durationSeconds: 30,
   * });
   * ```
   */
  create: protectedProcedure
    .input(createRecordingInput)
    .handler(async ({ input, context }) => {
      const recording = await RecordingsService.createRecording({
        userId: context.user.id,
        file: input.file,
        filename: input.filename,
        durationSeconds: input.durationSeconds,
        recordedAt: input.recordedAt,
      });

      // Send push notification to all users except the sender
      const senderName = await NotificationsService.getUserDisplayName(
        context.user.id
      );
      NotificationsService.broadcastNotification(
        context.user.id,
        "New Recording",
        `${senderName} just sent a new recording`
      ).catch((err) => console.error("Failed to send notification:", err));

      return recording;
    }),

  /**
   * Update recording metadata.
   * Can update recordedAt timestamp and/or replace all keywords.
   *
   * @throws NOT_FOUND if recording doesn't exist
   *
   * @example
   * ```typescript
   * const updated = await client.recordings.update({
   *   id: "uuid",
   *   keywords: ["meeting", "project"],
   * });
   * ```
   */
  update: protectedProcedure.input(updateRecordingInput).handler(({ input }) =>
    RecordingsService.updateRecording({
      id: input.id,
      recordedAt: input.recordedAt ? new Date(input.recordedAt) : undefined,
      keywords: input.keywords,
    })
  ),

  /**
   * Archive a recording (move to Archived tab).
   */
  archive: protectedProcedure
    .input(getRecordingInput)
    .handler(async ({ input, context }) => {
      const result = await RecordingsService.archiveRecording(input.id);

      // Send push notification to all users except the one who archived
      const userName = await NotificationsService.getUserDisplayName(
        context.user.id
      );
      NotificationsService.broadcastNotification(
        context.user.id,
        "Recording Archived",
        `${userName} archived a recording`
      ).catch((err) => console.error("Failed to send notification:", err));

      return result;
    }),

  /**
   * Unarchive a recording (move back to Current tab).
   */
  unarchive: protectedProcedure
    .input(getRecordingInput)
    .handler(({ input }) => RecordingsService.unarchiveRecording(input.id)),

  /**
   * Delete a recording and its audio file.
   *
   * @throws NOT_FOUND if recording doesn't exist
   * @throws BAD_REQUEST if storage deletion fails
   *
   * @example
   * ```typescript
   * await client.recordings.delete({ id: "uuid" });
   * ```
   */
  delete: protectedProcedure
    .input(deleteRecordingInput)
    .handler(({ input }) => RecordingsService.deleteRecording(input.id)),

  /**
   * Process pending recordings (transcription + keyword generation).
   * Used for batch processing or retrying failed transcriptions.
   *
   * @example
   * ```typescript
   * const result = await client.recordings.processPending({ limit: 10 });
   * console.log(`Processed ${result.processed}, ${result.remaining} remaining`);
   * ```
   */
  processPending: protectedProcedure
    .input(processPendingInput)
    .handler(({ input }) =>
      RecordingsService.processPendingRecordings(input.limit ?? 10)
    ),
};
