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
