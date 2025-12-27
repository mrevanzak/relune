import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@relune/db";
import type { Recording } from "@relune/db/schema";
import { keywords, recordingKeywords, recordings } from "@relune/db/schema";
import { env } from "@relune/env";
import { generateText } from "ai";
import { count, desc, eq, inArray, isNull } from "drizzle-orm";
import { convertToM4a, needsConversion } from "@/shared/audio-converter";
import {
	deleteAudioFromStorage,
	getContentType,
	uploadAudioToStorage,
} from "@/shared/storage";
import type { ListRecordingsParam } from "./model";

/**
 * Non-request-dependent business logic for recordings
 * Services accept primitives and return domain data (no Elysia Context)
 */

// Initialize OpenAI provider for keyword generation
const openai = createOpenAI({
	apiKey: env.OPENAI_API_KEY,
});

export type RecordingKeywordItem = {
	id: string;
	name: string;
};

export type RecordingWithKeywords = Recording & {
	keywords: RecordingKeywordItem[];
};

export async function listRecordings({
	limit,
	offset,
}: Required<ListRecordingsParam>): Promise<RecordingWithKeywords[]> {
	// 1. Fetch recordings with pagination
	const recordingResults = await db
		.select()
		.from(recordings)
		.orderBy(desc(recordings.recordedAt))
		.limit(limit)
		.offset(offset);

	if (recordingResults.length === 0) {
		return [];
	}

	// 2. Batch fetch all keywords for these recordings
	const recordingIds = recordingResults.map((r) => r.id);
	const keywordResults = await db
		.select({
			recordingId: recordingKeywords.recordingId,
			keywordId: keywords.id,
			keywordName: keywords.name,
		})
		.from(recordingKeywords)
		.innerJoin(keywords, eq(recordingKeywords.keywordId, keywords.id))
		.where(inArray(recordingKeywords.recordingId, recordingIds));

	// 3. Group keywords by recording ID
	const keywordsByRecording = new Map<string, RecordingKeywordItem[]>();
	for (const kw of keywordResults) {
		const existing = keywordsByRecording.get(kw.recordingId) ?? [];
		existing.push({ id: kw.keywordId, name: kw.keywordName });
		keywordsByRecording.set(kw.recordingId, existing);
	}

	// 4. Combine recordings with their keywords
	return recordingResults.map((r) => ({
		...r,
		keywords: keywordsByRecording.get(r.id) ?? [],
	}));
}

export type GetRecordingOptions = {
	id: string;
	userId: string;
};

export type GetRecordingResult =
	| { recording: RecordingWithKeywords; error: null }
	| { recording: null; error: "not_found" | "forbidden" };

export async function getRecording({
	id,
}: GetRecordingOptions): Promise<GetRecordingResult> {
	const result = await db
		.select()
		.from(recordings)
		.where(eq(recordings.id, id))
		.limit(1);

	const recording = result[0];

	if (!recording) {
		return { recording: null, error: "not_found" };
	}

	// Fetch keywords for this recording
	const keywordResults = await db
		.select({
			keywordId: keywords.id,
			keywordName: keywords.name,
		})
		.from(recordingKeywords)
		.innerJoin(keywords, eq(recordingKeywords.keywordId, keywords.id))
		.where(eq(recordingKeywords.recordingId, id));

	const recordingWithKeywords: RecordingWithKeywords = {
		...recording,
		keywords: keywordResults.map((kw) => ({
			id: kw.keywordId,
			name: kw.keywordName,
		})),
	};

	return { recording: recordingWithKeywords, error: null };
}

/**
 * Get pending recordings that need transcription
 */
export async function getPendingRecordings(
	limit: number,
): Promise<Recording[]> {
	return await db
		.select()
		.from(recordings)
		.where(isNull(recordings.transcript))
		.orderBy(recordings.createdAt)
		.limit(limit);
}

/**
 * Transcribe audio using OpenAI Whisper API via plain fetch
 * Converts unsupported formats (opus, ogg, etc.) to m4a before transcription
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
	const audioBlob = await fetch(audioUrl).then((res) => res.blob());

	// Create FormData for OpenAI Whisper API
	const formData = new FormData();
	formData.append("file", audioBlob, "audio.m4a");
	formData.append("model", "whisper-1");

	// Call OpenAI Whisper API directly
	const response = await fetch(
		"https://api.openai.com/v1/audio/transcriptions",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.OPENAI_API_KEY}`,
			},
			body: formData,
		},
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`OpenAI transcription failed: ${response.status} ${error}`);
	}

	const result = (await response.json()) as { text: string };
	return result.text;
}

/**
 * Generate keywords from transcript using GPT-4o-mini
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
 * Save keywords to database
 */
async function saveKeywords(
	recordingId: string,
	keywordNames: string[],
): Promise<void> {
	for (const name of keywordNames) {
		// Upsert keyword
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

		// Link to recording
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
 * Process a single recording: transcribe and generate keywords
 */
export async function processRecording(
	recording: Recording,
): Promise<{ success: boolean; error?: string }> {
	try {
		// Transcribe audio directly from URL
		// OpenAI detects format from the .m4a extension in the URL
		const transcript = await transcribeAudio(recording.audioUrl);

		// Generate keywords
		const keywordList = await generateKeywords(transcript);

		// Update recording with transcript
		await db
			.update(recordings)
			.set({
				transcript,
				updatedAt: new Date(),
			})
			.where(eq(recordings.id, recording.id));

		// Save keywords
		await saveKeywords(recording.id, keywordList);

		return { success: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return { success: false, error: message };
	}
}

/**
 * Process pending recordings in batch
 */
export type ProcessPendingResult = {
	processed: number;
	remaining: number;
	errors: Array<{ id: string; error: string }>;
};

export async function processPendingRecordings(
	limit: number,
): Promise<ProcessPendingResult> {
	const pending = await getPendingRecordings(limit);
	const results = await Promise.all(
		pending.map(async (recording) => {
			const result = await processRecording(recording);
			return { id: recording.id, result };
		}),
	);

	const processed = results.reduce(
		(acc, { result }) => acc + (result.success ? 1 : 0),
		0,
	);
	const errors: Array<{ id: string; error: string }> = results
		.filter(({ result }) => !result.success)
		.map(({ id, result }) => ({
			id,
			error: result.error || "Unknown error",
		}));

	// Count remaining
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

/**
 * Create a new recording from in-app recording upload
 */
export type CreateAppRecordingOptions = {
	userId: string;
	file: string; // base64-encoded audio data
	filename: string;
	durationSeconds?: number;
	recordedAt?: Date;
};

export type CreateAppRecordingResult =
	| { recording: Recording; error: null }
	| { recording: null; error: string };

export async function createAppRecording({
	userId,
	file,
	filename,
	durationSeconds,
	recordedAt,
}: CreateAppRecordingOptions): Promise<CreateAppRecordingResult> {
	try {
		// Decode base64 file content
		const fileBuffer = Buffer.from(file, "base64");
		const fileContent = new Uint8Array(fileBuffer);

		// Convert to m4a if needed (opus, ogg, wav, etc.)
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
			contentType,
		);

		if (uploadResult.error) {
			return { recording: null, error: `Upload failed: ${uploadResult.error}` };
		}

		// Create recording in database
		const result = await db
			.insert(recordings)
			.values({
				userId,
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
			return { recording: null, error: "Failed to create recording" };
		}

		// Trigger transcription in background (fire-and-forget)
		processRecording(recording).catch((err) =>
			console.error(`Transcription failed for recording ${recording.id}:`, err),
		);

		return { recording, error: null };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return { recording: null, error: message };
	}
}

/**
 * Delete a recording
 */
export type DeleteRecordingOptions = {
	id: string;
};

export type DeleteRecordingResult =
	| { success: true; error: null }
	| { success: false; error: "not_found" | "forbidden" | string };

export async function deleteRecording({
	id,
}: DeleteRecordingOptions): Promise<DeleteRecordingResult> {
	try {
		// Fetch recording
		const result = await db
			.select()
			.from(recordings)
			.where(eq(recordings.id, id))
			.limit(1);

		const recording = result[0];

		if (!recording) {
			return { success: false, error: "not_found" };
		}

		// Delete from storage
		const storageResult = await deleteAudioFromStorage(recording.audioUrl);
		if (!storageResult.success) {
			return {
				success: false,
				error: `Storage deletion failed: ${storageResult.error}`,
			};
		}

		// Delete from database (cascade will handle recordingKeywords)
		await db.delete(recordings).where(eq(recordings.id, id));

		return { success: true, error: null };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return { success: false, error: message };
	}
}
