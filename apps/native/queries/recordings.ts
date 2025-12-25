import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isNetworkError } from "@/lib/api";
import { uploadRecording } from "@/lib/upload-recording";
import { useUploadQueueStore } from "@/stores/upload-queue";

export interface UploadRecordingParams {
	uri: string;
	durationSeconds: number;
	recordedAt?: Date;
}

/**
 * Mutation hook for uploading a recording to the server.
 *
 * On success: invalidates the recordings query cache.
 * On network error: queues the upload for later retry.
 */
export function useUploadRecordingMutation() {
	const queryClient = useQueryClient();
	const addToQueue = useUploadQueueStore.use.addToQueue();

	return useMutation({
		mutationFn: async (params: UploadRecordingParams) => {
			return uploadRecording({
				uri: params.uri,
				durationSeconds: params.durationSeconds,
				recordedAt: (params.recordedAt ?? new Date()).toISOString(),
			});
		},
		onSuccess: () => {
			// Invalidate recordings list to show the new recording
			queryClient.invalidateQueries({ queryKey: ["recordings"] });
		},
		onError: (error, variables) => {
			// If offline, queue for later
			if (isNetworkError(error)) {
				addToQueue({
					uri: variables.uri,
					durationSeconds: variables.durationSeconds,
					recordedAt: (variables.recordedAt ?? new Date()).toISOString(),
				});
			}
		},
	});
}

/**
 * Query key for recordings list
 */
export const recordingsQueryKey = ["recordings"] as const;
