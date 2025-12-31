import { createOpenAI } from "@ai-sdk/openai";
import { ORPCError } from "@orpc/server";
import { db } from "@relune/db";
import type { Recording } from "@relune/db/schema";
import {
  keywords,
  recordingKeywords,
  recordings,
  userSettings,
  users,
} from "@relune/db/schema";
import { env } from "@relune/env";
import { generateText } from "ai";
import {
  and,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { createServiceLogger } from "../lib/logger";
import type {
  CreateRecordingInput,
  ListRecordingsInput,
} from "../models/recordings";
import { convertToM4a, needsConversion } from "./audio-converter";
import {
  deleteAudioFromStorage,
  getContentType,
  uploadAudioToStorage,
} from "./storage";

const log = createServiceLogger("recordings");

/**
 * Recordings service - business logic for audio recordings.
 *
 * All functions throw ORPCError for error cases:
 * - NOT_FOUND: Recording doesn't exist
 * - FORBIDDEN: User not authorized (reserved for future multi-user)
 * - BAD_REQUEST: Invalid input or operation failed
 */

// Initialize OpenAI provider for keyword generation
const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// ============================================================================
// Types
// ============================================================================

export type RecordingKeywordItem = {
  id: string;
  name: string;
};

export type RecordingWithKeywords = Recording & {
  keywords: RecordingKeywordItem[];
};

export type RecordingWithKeywordsAndUsers = RecordingWithKeywords & {
  /** Convenience field for UI (resolved from senderId, with app fallback). */
  senderName: string | null;
  /** Convenience field for UI (resolved from importedById). */
  importedByName: string | null;
};

export type UpdateRecordingInput = {
  id: string;
  recordedAt?: Date;
  keywords?: string[];
};

export type ProcessPendingResult = {
  processed: number;
  remaining: number;
  errors: Array<{ id: string; error: string }>;
};

// ============================================================================
// Helpers
// ============================================================================

type UserLookup = {
  email: string;
  displayName: string | null;
};

function getDisplayLabel(user: UserLookup): string {
  return user.displayName ?? user.email;
}

function getEffectiveSenderId(recording: Recording): string | null {
  // For in-app recordings, sender is the uploader by default.
  if (recording.senderId) {
    return recording.senderId;
  }
  if (recording.importSource === "app") {
    return recording.userId;
  }
  return null;
}

async function getAutoArchiveDays(userId: string): Promise<number | null> {
  // Ensure settings row exists (default is "disabled").
  await db
    .insert(userSettings)
    .values({ userId, autoArchiveDays: null })
    .onConflictDoNothing();

  const result = await db
    .select({ autoArchiveDays: userSettings.autoArchiveDays })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return result[0]?.autoArchiveDays ?? null;
}

async function autoArchiveOldRecordings(
  userId: string,
  now: Date
): Promise<void> {
  const autoArchiveDays = await getAutoArchiveDays(userId);
  if (!autoArchiveDays) return;

  const thresholdMs = autoArchiveDays * 24 * 60 * 60 * 1000;
  const thresholdDate = new Date(now.getTime() - thresholdMs);

  await db
    .update(recordings)
    .set({
      isArchived: true,
      archivedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(recordings.importSource, "app"),
        eq(recordings.isArchived, false),
        lt(recordings.recordedAt, thresholdDate)
      )
    );
}

function buildListWhereCondition(input: {
  tab?: "current" | "archived";
  search?: string;
}): SQL | undefined {
  const conditions: Array<SQL | undefined> = [];

  if (input.tab === "current") {
    conditions.push(
      and(eq(recordings.importSource, "app"), eq(recordings.isArchived, false))
    );
  }

  if (input.tab === "archived") {
    conditions.push(
      or(
        eq(recordings.isArchived, true),
        eq(recordings.importSource, "whatsapp")
      )
    );
  }

  const search = input.search?.trim();
  if (search) {
    const searchTerm = `%${search}%`;

    const keywordMatch = db
      .select({ id: sql`1` })
      .from(recordingKeywords)
      .innerJoin(keywords, eq(recordingKeywords.keywordId, keywords.id))
      .where(
        and(
          eq(recordingKeywords.recordingId, recordings.id),
          ilike(keywords.name, searchTerm)
        )
      );

    conditions.push(
      or(
        ilike(recordings.transcript, searchTerm),
        ilike(recordings.originalFilename, searchTerm),
        ilike(recordings.notes, searchTerm),
        exists(keywordMatch)
      )
    );
  }

  return and(...conditions);
}

async function getKeywordsByRecordingIds(
  recordingIds: string[]
): Promise<Map<string, RecordingKeywordItem[]>> {
  if (recordingIds.length === 0) {
    return new Map();
  }

  const keywordResults = await db
    .select({
      recordingId: recordingKeywords.recordingId,
      keywordId: keywords.id,
      keywordName: keywords.name,
    })
    .from(recordingKeywords)
    .innerJoin(keywords, eq(recordingKeywords.keywordId, keywords.id))
    .where(inArray(recordingKeywords.recordingId, recordingIds));

  const keywordsByRecording = new Map<string, RecordingKeywordItem[]>();
  for (const kw of keywordResults) {
    const existing = keywordsByRecording.get(kw.recordingId) ?? [];
    existing.push({ id: kw.keywordId, name: kw.keywordName });
    keywordsByRecording.set(kw.recordingId, existing);
  }

  return keywordsByRecording;
}

async function getUsersForRecordings(
  recordingRows: Recording[]
): Promise<Map<string, UserLookup>> {
  const userIds = new Set<string>();
  for (const recording of recordingRows) {
    const senderId = getEffectiveSenderId(recording);
    if (senderId) {
      userIds.add(senderId);
    }
    if (recording.importedById) {
      userIds.add(recording.importedById);
    }
  }

  const userIdList = Array.from(userIds);
  if (userIdList.length === 0) {
    return new Map();
  }

  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(users)
    .where(inArray(users.id, userIdList));

  const usersById = new Map<string, UserLookup>();
  for (const user of userRows) {
    usersById.set(user.id, {
      email: user.email,
      displayName: user.displayName,
    });
  }

  return usersById;
}

function resolveName(
  usersById: Map<string, UserLookup>,
  id: string | null
): string | null {
  if (!id) return null;
  const user = usersById.get(id);
  return user ? getDisplayLabel(user) : null;
}

function toRecordingWithKeywordsAndUsers(
  recording: Recording,
  keywords: RecordingKeywordItem[],
  usersById: Map<string, UserLookup>
): RecordingWithKeywordsAndUsers {
  const effectiveSenderId = getEffectiveSenderId(recording);

  return {
    ...recording,
    senderId: effectiveSenderId,
    senderName: resolveName(usersById, effectiveSenderId),
    importedByName: resolveName(usersById, recording.importedById ?? null),
    keywords,
  };
}

// ============================================================================
// List Recordings
// ============================================================================

/**
 * List recordings with optional search and pagination.
 * Searches across transcript, filename, and keywords.
 */
export async function listRecordings({
  userId,
  limit = 20,
  offset = 0,
  search,
  tab,
}: NonNullable<ListRecordingsInput> & {
  userId: string;
}): Promise<RecordingWithKeywordsAndUsers[]> {
  const now = new Date();

  // Auto-archive is applied transparently when fetching the current tab.
  if (tab === "current") {
    await autoArchiveOldRecordings(userId, now);
  }
  const where = buildListWhereCondition({ tab, search });

  const recordingResults = await db
    .select()
    .from(recordings)
    .where(where)
    .orderBy(desc(recordings.recordedAt))
    .limit(limit)
    .offset(offset);

  if (recordingResults.length === 0) {
    return [];
  }

  const recordingIds = recordingResults.map((r) => r.id);
  const keywordsByRecording = await getKeywordsByRecordingIds(recordingIds);
  const usersById = await getUsersForRecordings(recordingResults);

  return recordingResults.map((recording) =>
    toRecordingWithKeywordsAndUsers(
      recording,
      keywordsByRecording.get(recording.id) ?? [],
      usersById
    )
  );
}

// ============================================================================
// Get Recording
// ============================================================================

/**
 * Get a single recording by ID with keywords.
 *
 * @throws ORPCError NOT_FOUND if recording doesn't exist
 */
export async function getRecording(
  id: string
): Promise<RecordingWithKeywordsAndUsers> {
  const result = await db
    .select()
    .from(recordings)
    .where(eq(recordings.id, id))
    .limit(1);

  const recording = result[0];

  if (!recording) {
    throw new ORPCError("NOT_FOUND", {
      message: "Recording not found",
      data: { code: "RECORDING_NOT_FOUND", id },
    });
  }

  const keywordResults = await db
    .select({
      keywordId: keywords.id,
      keywordName: keywords.name,
    })
    .from(recordingKeywords)
    .innerJoin(keywords, eq(recordingKeywords.keywordId, keywords.id))
    .where(eq(recordingKeywords.recordingId, id));

  const usersById = await getUsersForRecordings([recording]);

  return toRecordingWithKeywordsAndUsers(
    recording,
    keywordResults.map((kw) => ({ id: kw.keywordId, name: kw.keywordName })),
    usersById
  );
}

// ============================================================================
// Create Recording
// ============================================================================

/**
 * Create a new recording from in-app upload.
 * Handles base64 decoding, format conversion, storage upload, and DB insert.
 * Triggers transcription in background.
 *
 * @throws ORPCError BAD_REQUEST if upload or creation fails
 */
export async function createRecording({
  userId,
  file,
  filename,
  durationSeconds,
  recordedAt,
}: CreateRecordingInput & {
  userId: string;
}): Promise<Recording> {
  // Decode base64 file content
  const fileBuffer = Buffer.from(file, "base64");
  const fileContent = new Uint8Array(fileBuffer);

  // Convert to m4a if needed
  let finalContent: Uint8Array<ArrayBufferLike> = fileContent;
  let finalFilename = filename;
  if (needsConversion(filename)) {
    const converted = await convertToM4a(fileContent, filename);
    finalContent = converted.data;
    finalFilename = converted.filename;
  }

  const contentType = getContentType(finalFilename);

  // Upload to storage
  const uploadResult = await uploadAudioToStorage(
    finalFilename,
    finalContent,
    contentType
  );

  if (uploadResult.error) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Upload failed: ${uploadResult.error}`,
      data: { code: "UPLOAD_FAILED" },
    });
  }

  // Create recording in database
  const result = await db
    .insert(recordings)
    .values({
      userId,
      senderId: userId,
      audioUrl: uploadResult.url,
      durationSeconds: durationSeconds ?? null,
      fileSizeBytes: finalContent.length,
      recordedAt: recordedAt ?? new Date(),
      importSource: "app" as const,
      originalFilename: finalFilename,
    })
    .returning();

  const recording = result[0];
  if (!recording) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Failed to create recording",
      data: { code: "CREATE_FAILED" },
    });
  }

  // Trigger transcription in background (fire-and-forget)
  processRecording(recording).catch((err) =>
    log.error({ recordingId: recording.id, err }, "Transcription failed")
  );

  return recording;
}

// ============================================================================
// Delete Recording
// ============================================================================

/**
 * Delete a recording and its audio file from storage.
 *
 * @throws ORPCError NOT_FOUND if recording doesn't exist
 * @throws ORPCError BAD_REQUEST if storage deletion fails
 */
export async function deleteRecording(id: string): Promise<{ success: true }> {
  const result = await db
    .select()
    .from(recordings)
    .where(eq(recordings.id, id))
    .limit(1);

  const recording = result[0];

  if (!recording) {
    throw new ORPCError("NOT_FOUND", {
      message: "Recording not found",
      data: { code: "RECORDING_NOT_FOUND", id },
    });
  }

  // Delete from storage
  const storageResult = await deleteAudioFromStorage(recording.audioUrl);
  if (!storageResult.success) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Storage deletion failed: ${storageResult.error}`,
      data: { code: "DELETE_FAILED" },
    });
  }

  // Delete from database (cascade handles recordingKeywords)
  await db.delete(recordings).where(eq(recordings.id, id));

  return { success: true };
}

// ============================================================================
// Update Recording
// ============================================================================

/**
 * Update a recording's metadata (recordedAt, keywords).
 *
 * @throws ORPCError NOT_FOUND if recording doesn't exist
 */
export async function updateRecording({
  id,
  recordedAt,
  keywords: newKeywords,
}: UpdateRecordingInput): Promise<RecordingWithKeywordsAndUsers> {
  // Verify recording exists
  const existing = await db
    .select()
    .from(recordings)
    .where(eq(recordings.id, id))
    .limit(1);

  if (!existing[0]) {
    throw new ORPCError("NOT_FOUND", {
      message: "Recording not found",
      data: { code: "RECORDING_NOT_FOUND", id },
    });
  }

  // Update recordedAt if provided
  if (recordedAt) {
    await db
      .update(recordings)
      .set({ recordedAt, updatedAt: new Date() })
      .where(eq(recordings.id, id));
  }

  // Replace keywords if provided
  if (newKeywords !== undefined) {
    await db
      .delete(recordingKeywords)
      .where(eq(recordingKeywords.recordingId, id));

    if (newKeywords.length > 0) {
      await saveKeywords(id, newKeywords);
    }
  }

  return getRecording(id);
}

// ============================================================================
// Archive / Unarchive
// ============================================================================

export async function archiveRecording(
  id: string
): Promise<RecordingWithKeywordsAndUsers> {
  const existing = await db
    .select({
      id: recordings.id,
      userId: recordings.userId,
      senderId: recordings.senderId,
      importSource: recordings.importSource,
    })
    .from(recordings)
    .where(eq(recordings.id, id))
    .limit(1);

  const recording = existing[0];
  if (!recording) {
    throw new ORPCError("NOT_FOUND", {
      message: "Recording not found",
      data: { code: "RECORDING_NOT_FOUND", id },
    });
  }

  const now = new Date();
  const effectiveSenderId =
    recording.senderId ??
    (recording.importSource === "app" ? recording.userId : null);

  const updateValues: {
    isArchived: true;
    archivedAt: Date;
    updatedAt: Date;
    senderId?: string | null;
  } = {
    isArchived: true,
    archivedAt: now,
    updatedAt: now,
  };

  if (effectiveSenderId) {
    updateValues.senderId = effectiveSenderId;
  }

  await db.update(recordings).set(updateValues).where(eq(recordings.id, id));

  return getRecording(id);
}

export async function unarchiveRecording(
  id: string
): Promise<RecordingWithKeywordsAndUsers> {
  const existing = await db
    .select({
      id: recordings.id,
      importSource: recordings.importSource,
    })
    .from(recordings)
    .where(eq(recordings.id, id))
    .limit(1);

  const recording = existing[0];
  if (!recording) {
    throw new ORPCError("NOT_FOUND", {
      message: "Recording not found",
      data: { code: "RECORDING_NOT_FOUND", id },
    });
  }

  if (recording.importSource === "whatsapp") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Cannot unarchive imported WhatsApp recordings",
      data: { code: "CANNOT_UNARCHIVE_IMPORTED" },
    });
  }

  const now = new Date();
  await db
    .update(recordings)
    .set({
      isArchived: false,
      archivedAt: null,
      updatedAt: now,
    })
    .where(eq(recordings.id, id));

  return getRecording(id);
}

// ============================================================================
// Transcription & Keywords
// ============================================================================

/**
 * Get pending recordings that need transcription.
 */
export async function getPendingRecordings(
  limit: number
): Promise<Recording[]> {
  return await db
    .select()
    .from(recordings)
    .where(isNull(recordings.transcript))
    .orderBy(recordings.createdAt)
    .limit(limit);
}

/**
 * Transcribe audio using OpenAI Whisper API.
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  const audioBlob = await fetch(audioUrl).then((res) => res.blob());

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.m4a");
  formData.append("model", "whisper-1");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI transcription failed: ${response.status} ${error}`);
  }

  const result = (await response.json()) as { text: string };
  return result.text;
}

/**
 * Generate keywords from transcript using GPT-4o-mini.
 */
async function generateKeywords(transcript: string): Promise<string[]> {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Extract 3-5 keywords or key phrases from this transcript. Return only the keywords, one per line, no numbering or bullets.

Transcript:
${transcript}`,
  });

  return text
    .split("\n")
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && k.length < 50);
}

/**
 * Save keywords to database (upsert pattern).
 */
export async function saveKeywords(
  recordingId: string,
  keywordNames: string[]
): Promise<void> {
  for (const name of keywordNames) {
    const existing = await db
      .select()
      .from(keywords)
      .where(eq(keywords.name, name.toLowerCase()))
      .limit(1);

    let keywordId: string;

    if (existing[0]) {
      keywordId = existing[0].id;
    } else {
      const inserted = await db
        .insert(keywords)
        .values({ name: name.toLowerCase() })
        .returning({ id: keywords.id });
      const insertedKeyword = inserted[0];
      if (!insertedKeyword) continue;
      keywordId = insertedKeyword.id;
    }

    await db
      .insert(recordingKeywords)
      .values({
        recordingId,
        keywordId,
        isAutoGenerated: true,
      })
      .onConflictDoNothing();
  }
}

/**
 * Process a single recording: transcribe and generate keywords.
 */
export async function processRecording(
  recording: Recording
): Promise<{ success: boolean; error?: string }> {
  try {
    const transcript = await transcribeAudio(recording.audioUrl);
    const keywordList = await generateKeywords(transcript);

    await db
      .update(recordings)
      .set({
        transcript,
        updatedAt: new Date(),
      })
      .where(eq(recordings.id, recording.id));

    await saveKeywords(recording.id, keywordList);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Process pending recordings in batch.
 */
export async function processPendingRecordings(
  limit: number
): Promise<ProcessPendingResult> {
  const pending = await getPendingRecordings(limit);
  const results = await Promise.all(
    pending.map(async (recording) => {
      const result = await processRecording(recording);
      return { id: recording.id, result };
    })
  );

  const processed = results.reduce(
    (acc, { result }) => acc + (result.success ? 1 : 0),
    0
  );
  const errors: Array<{ id: string; error: string }> = results
    .filter(({ result }) => !result.success)
    .map(({ id, result }) => ({
      id,
      error: result.error || "Unknown error",
    }));

  const remainingCountResult = await db
    .select({ count: count() })
    .from(recordings)
    .where(isNull(recordings.transcript));
  const remainingCount = remainingCountResult[0]?.count ?? 0;

  return {
    processed,
    remaining: remainingCount,
    errors,
  };
}
