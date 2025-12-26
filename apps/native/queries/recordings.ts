import { queryOptions, useMutation } from "@tanstack/react-query";
import type { ListRecordingsParam } from "server/src/modules/recordings/model";
import { api, isNetworkError } from "@/lib/api";
import { uploadRecording } from "@/lib/upload-recording";
import { uploadQueueStore } from "@/stores/upload-queue";

export interface UploadRecordingParams {
	uri: string;
	durationSeconds: number;
	recordedAt?: Date;
}

export const recordingsQueryOptions = (params?: ListRecordingsParam) =>
	queryOptions({
		queryKey: ["recordings", params],
		queryFn: async () => {
			const { data, error } = await api.recordings.get({ query: params });
			if (error) {
				throw new Error(error.value?.message ?? "Failed to fetch recordings");
			}

			if ("error" in data) {
				throw new Error(data.error.message ?? "Failed to fetch recordings");
			}

			return data;
		},
	});

/**
 * Mutation hook for uploading a recording to the server.
 *
 * On success: invalidates the recordings query cache.
 * On network error: queues the upload for later retry.
 */
export function useUploadRecordingMutation() {
	const addToQueue = uploadQueueStore.use.addToQueue();

	return useMutation({
		mutationFn: async (params: UploadRecordingParams) => {
			return uploadRecording({
				uri: params.uri,
				durationSeconds: params.durationSeconds,
				recordedAt: (params.recordedAt ?? new Date()).toISOString(),
			});
		},
		onSuccess: (_data, _variables, _onMutateResult, context) => {
			// Invalidate recordings list to show the new recording
			context.client.invalidateQueries({
				queryKey: recordingsQueryOptions().queryKey,
			});
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
