import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, isNetworkError } from "@/lib/api";
import { uriToFile } from "@/lib/file-utils";
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
			// Convert RN file URI to File object
			const file = await uriToFile(params.uri);

			// Upload via Eden API
			const response = await api.recordings.post({
				file,
				durationSeconds: params.durationSeconds,
				recordedAt: (params.recordedAt ?? new Date()).toISOString(),
			});

			if (response.error) {
				throw new Error(
					typeof response.error.value === "string"
						? response.error.value
						: "Upload failed",
				);
			}

			return response.data;
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
