import { randomUUID } from "node:crypto";
import { db } from "@relune/db";
import { recordings, users } from "@relune/db/schema";
import { and, eq } from "drizzle-orm";
import { supabase } from "@/shared/supabase";

/**
 * WhatsApp Import Service
 * Parses WhatsApp chat exports and creates recordings
 */

// Types for parsed WhatsApp data
export type ParsedAudioMessage = {
	timestamp: Date;
	sender: string;
	filename: string;
	notes: string | null; // Text message following the audio
};

export type ParseResult = {
	audioMessages: ParsedAudioMessage[];
	errors: string[];
};

/**
 * Parse WhatsApp _chat.txt format
 * Format: [MM/DD/YY, HH:MM:SS] Sender: <attached: filename.opus>
 */
export function parseChatTxt(content: string): ParseResult {
	const lines = content.split(/\r?\n/);
	const audioMessages: ParsedAudioMessage[] = [];
	const errors: string[] = [];

	// Regex patterns
	const messagePattern =
		/^\[(\d{1,2}\/\d{1,2}\/\d{2}),\s*(\d{1,2}:\d{2}:\d{2})\]\s*(.+?):\s*(.*)$/;
	const attachmentPattern = /<attached:\s*(.+?)>/;
	const audioExtensions = [".opus", ".m4a", ".mp3", ".wav", ".ogg"];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]?.trim();
		if (!line) continue;

		// Remove invisible characters that WhatsApp sometimes adds
		const cleanLine = line.replace(/[\u200e\u200f\u202a-\u202e]/g, "");

		const match = cleanLine.match(messagePattern);
		if (!match) continue;

		const [, dateStr, timeStr, sender, messageContent] = match;
		if (!dateStr || !timeStr || !sender || !messageContent) continue;

		// Check if this is an audio attachment
		const attachmentMatch = messageContent.match(attachmentPattern);
		if (!attachmentMatch) continue;

		const filename = attachmentMatch[1];
		if (!filename) continue;

		// Check if it's an audio file
		const isAudio = audioExtensions.some((ext) =>
			filename.toLowerCase().endsWith(ext),
		);
		if (!isAudio) continue;

		// Parse timestamp (MM/DD/YY, HH:MM:SS)
		const [month, day, year] = dateStr.split("/").map(Number);
		const [hours, minutes, seconds] = timeStr.split(":").map(Number);

		if (
			month === undefined ||
			day === undefined ||
			year === undefined ||
			hours === undefined ||
			minutes === undefined ||
			seconds === undefined
		) {
			errors.push(`Invalid date/time format at line ${i + 1}`);
			continue;
		}

		// Convert 2-digit year to 4-digit (25 -> 2025)
		const fullYear = year < 100 ? 2000 + year : year;
		const timestamp = new Date(
			fullYear,
			month - 1,
			day,
			hours,
			minutes,
			seconds,
		);

		if (Number.isNaN(timestamp.getTime())) {
			errors.push(`Invalid timestamp at line ${i + 1}`);
			continue;
		}

		// Look for potential notes (text message from same sender right after)
		let notes: string | null = null;
		if (i + 1 < lines.length) {
			const nextLine = lines[i + 1]
				?.trim()
				.replace(/[\u200e\u200f\u202a-\u202e]/g, "");
			if (nextLine) {
				const nextMatch = nextLine.match(messagePattern);
				if (nextMatch) {
					const [, , , nextSender, nextContent] = nextMatch;
					// If same sender and not an attachment, it could be notes
					if (
						nextSender === sender &&
						nextContent &&
						!nextContent.includes("<attached:")
					) {
						// Remove any edit markers
						notes =
							nextContent.replace(/<This message was edited>/g, "").trim() ||
							null;
					}
				}
			}
		}

		audioMessages.push({
			timestamp,
			sender,
			filename,
			notes,
		});
	}

	return { audioMessages, errors };
}

/**
 * Resolve or create a user by display name
 */
export async function resolveOrCreateUser(
	displayName: string,
): Promise<string> {
	// Try to find existing user by display name
	const existing = await db
		.select()
		.from(users)
		.where(eq(users.displayName, displayName))
		.limit(1);

	if (existing[0]) {
		return existing[0].id;
	}

	// Create new user with placeholder email
	const slug = displayName
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "");
	const userId = randomUUID();

	await db.insert(users).values({
		id: userId,
		email: `${slug}@import.local`,
		displayName,
	});

	return userId;
}

/**
 * Check if a recording already exists (by original filename and user)
 */
export async function checkDuplicate(
	userId: string,
	originalFilename: string,
): Promise<boolean> {
	const existing = await db
		.select({ id: recordings.id })
		.from(recordings)
		.where(
			and(
				eq(recordings.userId, userId),
				eq(recordings.originalFilename, originalFilename),
			),
		)
		.limit(1);

	return existing.length > 0;
}

/**
 * Upload audio file to Supabase Storage
 */
export async function uploadAudioToStorage(
	filename: string,
	fileContent: Uint8Array,
	contentType: string,
): Promise<{ url: string; error: string | null }> {
	const storagePath = `recordings/${randomUUID()}-${filename}`;

	const { error } = await supabase.storage
		.from("audio")
		.upload(storagePath, fileContent, {
			contentType,
			upsert: false,
		});

	if (error) {
		return { url: "", error: error.message };
	}

	// Get public URL (or use signed URL if bucket is private)
	const { data } = supabase.storage.from("audio").getPublicUrl(storagePath);

	return { url: data.publicUrl, error: null };
}

/**
 * Create a recording record in the database
 */
export async function createRecording(data: {
	userId: string;
	audioUrl: string;
	recordedAt: Date;
	originalFilename: string;
	notes: string | null;
	fileSizeBytes?: number;
}): Promise<string> {
	const result = await db
		.insert(recordings)
		.values({
			userId: data.userId,
			audioUrl: data.audioUrl,
			recordedAt: data.recordedAt,
			importSource: "whatsapp",
			originalFilename: data.originalFilename,
			notes: data.notes,
			fileSizeBytes: data.fileSizeBytes,
		})
		.returning({ id: recordings.id });

	const recordingId = result[0]?.id;
	if (!recordingId) {
		throw new Error("Failed to create recording");
	}

	return recordingId;
}

// Content type mapping for audio files
export function getContentType(filename: string): string {
	const ext = filename.toLowerCase().split(".").pop();
	const types: Record<string, string> = {
		opus: "audio/opus",
		m4a: "audio/mp4",
		mp3: "audio/mpeg",
		wav: "audio/wav",
		ogg: "audio/ogg",
	};
	return types[ext || ""] || "audio/mpeg";
}
