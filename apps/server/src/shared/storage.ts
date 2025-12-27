import { randomUUID } from "node:crypto";
import { supabase } from "./supabase";

/**
 * Shared storage utilities for uploading files to Supabase Storage
 */

/**
 * Get MIME type from filename extension
 */
export function getContentType(filename: string): string {
	const ext = filename.toLowerCase().split(".").pop();
	const types: Record<string, string> = {
		opus: "audio/opus",
		m4a: "audio/mp4",
		mp3: "audio/mpeg",
		wav: "audio/wav",
		ogg: "audio/ogg",
		webm: "audio/webm",
	};
	return types[ext || ""] || "audio/mpeg";
}

/**
 * Upload audio file to Supabase Storage
 * Returns the public URL of the uploaded file
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
 * Delete audio file from Supabase Storage by parsing the public URL
 * to extract the storage path (e.g. "recordings/<uuid>-<filename>")
 */
export async function deleteAudioFromStorage(
	audioUrl: string,
): Promise<{ success: boolean; error: string | null }> {
	try {
		// Parse the public URL to extract the storage path
		// Expected format: https://<project>.supabase.co/storage/v1/object/public/audio/<path>
		const url = new URL(audioUrl);
		const pathParts = url.pathname.split("/");

		// Find "audio" bucket index and get everything after it
		const audioBucketIndex = pathParts.indexOf("audio");
		if (audioBucketIndex === -1 || audioBucketIndex === pathParts.length - 1) {
			return {
				success: false,
				error: "Invalid audio URL: could not extract storage path",
			};
		}

		// Join remaining parts to get full storage path
		const storagePath = pathParts.slice(audioBucketIndex + 1).join("/");

		// Delete from storage
		const { error } = await supabase.storage
			.from("audio")
			.remove([storagePath]);

		if (error) {
			return { success: false, error: error.message };
		}

		return { success: true, error: null };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return { success: false, error: `Failed to parse audio URL: ${message}` };
	}
}
