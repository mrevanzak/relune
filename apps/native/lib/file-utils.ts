/**
 * Utility functions for converting React Native file URIs to File objects
 * compatible with Eden/FormData uploads.
 */

/**
 * Get MIME type from filename extension
 */
function getMimeType(filename: string): string {
	const ext = filename.split(".").pop()?.toLowerCase();
	const types: Record<string, string> = {
		m4a: "audio/mp4",
		mp3: "audio/mpeg",
		wav: "audio/wav",
		webm: "audio/webm",
		opus: "audio/opus",
		ogg: "audio/ogg",
	};
	return types[ext ?? ""] ?? "audio/mp4";
}

/**
 * Converts a React Native file URI to a File object compatible with Eden/FormData.
 *
 * React Native's fetch() supports local file URIs (file://), so we use it to get
 * a Blob, then wrap it in a File object.
 *
 * @param uri - Local file URI (e.g., file:///path/to/recording.m4a)
 * @param filename - Optional filename override
 * @param mimeType - Optional MIME type override
 * @returns File object ready for upload
 */
export async function uriToFile(
	uri: string,
	filename?: string,
	mimeType?: string,
): Promise<File> {
	// React Native's fetch supports file:// URIs
	const response = await fetch(uri);
	const blob = await response.blob();

	// Determine filename from URI if not provided
	const name = filename ?? uri.split("/").pop() ?? "recording.m4a";
	const type = mimeType ?? getMimeType(name);

	// Create File from Blob (RN's File class extends Blob)
	return new File([blob], name, { type });
}
