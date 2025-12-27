import { File } from "expo-file-system";
import { api } from "@/lib/api";

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
	const file = new File(params.uri);

	const filename = file.name;

	// Upload via API
	const { data, error } = await api.recordings.post({
		file: file.base64Sync(),
		filename,
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
