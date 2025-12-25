import { db } from "@relune/db";
import type { Recording } from "@relune/db/schema";
import { recordings } from "@relune/db/schema";
import { desc, eq } from "drizzle-orm";

/**
 * Non-request-dependent business logic for recordings
 * Services accept primitives and return domain data (no Elysia Context)
 */

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
