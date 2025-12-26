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
	const file = await uriToFile(params.uri);

	// Upload via API
	const { data, error } = await api.recordings.post({
		file,
		durationSeconds: params.durationSeconds,
		recordedAt: params.recordedAt,
	});

	if (error) throw new Error(error.value.message ?? "Upload failed");

	if (data && typeof data === "object" && "error" in data) {
		throw new Error(data.error?.message ?? "Upload failed");
	}

	return data.recording;
}
