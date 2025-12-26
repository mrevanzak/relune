import { api } from "@/lib/api";
import { uriToFile } from "@/lib/file-utils";

export interface UploadRecordingParams {
	uri: string;
	durationSeconds: number;
	recordedAt: string; // ISO 8601
}

/**
 * Shared upload function used by both the mutation hook and the queue worker.
 * Converts a React Native file URI to a File object and uploads via the API.
 */
export async function uploadRecording(params: UploadRecordingParams) {
	// Convert URI to File
	const file = uriToFile(params.uri);

	// Upload via API
	const { data, error } = await api.recordings.post({
		file,
		durationSeconds: params.durationSeconds,
		recordedAt: params.recordedAt,
	});

	if (error) throw new Error(error.value.message ?? "Upload failed");

	// Narrow the union type - error response vs success response
	if ("error" in data) {
		const errorData = data.error as { message?: string };
		throw new Error(errorData.message ?? "Upload failed");
	}

	return data.recording;
}
