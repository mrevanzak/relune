import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@relune/config/env";
import { db } from "@relune/db";
import type { Recording } from "@relune/db/schema";
import { keywords, recordingKeywords, recordings } from "@relune/db/schema";
import { generateText } from "ai";
import { desc, eq, isNull } from "drizzle-orm";
import { supabase } from "@/shared/supabase";

/**
 * Non-request-dependent business logic for recordings
 * Services accept primitives and return domain data (no Elysia Context)
 */

// Initialize OpenAI provider for transcription and keyword generation
const openai = createOpenAI({
	apiKey: env.OPENAI_API_KEY,
});

export type ListRecordingsOptions = {
	userId: string;
	limit: number;
	offset: number;
};

export type ListRecordingsResult = {
	recordings: Recording[];
	limit: number;
	offset: number;
};

export async function listRecordings({
	userId,
	limit,
	offset,
}: ListRecordingsOptions): Promise<ListRecordingsResult> {
	const results = await db
		.select()
		.from(recordings)
		.where(eq(recordings.userId, userId))
		.orderBy(desc(recordings.recordedAt))
		.limit(limit)
		.offset(offset);

	return { recordings: results, limit, offset };
}

export type GetRecordingOptions = {
	id: string;
	userId: string;
};

export type GetRecordingResult =
	| { recording: Recording; error: null }
	| { recording: null; error: "not_found" | "forbidden" };

export async function getRecording({
	id,
	userId,
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

	if (recording.userId !== userId) {
		return { recording: null, error: "forbidden" };
	}

	return { recording, error: null };
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
 * Download audio file from Supabase Storage
 */
async function downloadAudio(audioUrl: string): Promise<Uint8Array | null> {
	// Extract storage path from URL
	const url = new URL(audioUrl);
	const pathMatch = url.pathname.match(
		/\/storage\/v1\/object\/public\/audio\/(.+)/,
	);
	if (!pathMatch?.[1]) {
		// Try signed URL pattern or direct fetch
		const response = await fetch(audioUrl);
		if (!response.ok) return null;
		return new Uint8Array(await response.arrayBuffer());
	}

	const storagePath = pathMatch[1];
	const { data, error } = await supabase.storage
		.from("audio")
		.download(storagePath);

	if (error || !data) return null;
	return new Uint8Array(await data.arrayBuffer());
}

/**
 * Transcribe audio using OpenAI Whisper
 */
async function transcribeAudio(
	audioData: Uint8Array,
	filename: string,
): Promise<string> {
	// Create a File object for the API
	const file = new File([audioData], filename, { type: "audio/mpeg" });

	// Use OpenAI's transcription API directly
	const response = await fetch(
		"https://api.openai.com/v1/audio/transcriptions",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.OPENAI_API_KEY}`,
			},
			body: (() => {
				const formData = new FormData();
				formData.append("file", file);
				formData.append("model", "whisper-1");
				formData.append("language", "fr"); // Default to French, can be made dynamic
				return formData;
			})(),
		},
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Transcription failed: ${error}`);
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
		// Download audio
		const audioData = await downloadAudio(recording.audioUrl);
		if (!audioData) {
			return { success: false, error: "Failed to download audio" };
		}

		// Transcribe
		const filename = recording.originalFilename || "audio.m4a";
		const transcript = await transcribeAudio(audioData, filename);

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
	const errors: Array<{ id: string; error: string }> = [];
	let processed = 0;

	for (const recording of pending) {
		const result = await processRecording(recording);
		if (result.success) {
			processed++;
		} else {
			errors.push({ id: recording.id, error: result.error || "Unknown error" });
		}
	}

	// Count remaining
	const remainingCount = await db
		.select()
		.from(recordings)
		.where(isNull(recordings.transcript));

	return {
		processed,
		remaining: remainingCount.length - processed,
		errors,
	};
}
