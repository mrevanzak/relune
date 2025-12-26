import { useMutation } from "@tanstack/react-query";
import { isNetworkError } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { uploadRecording } from "@/lib/upload-recording";
import { recordingsQueryOptions } from "@/queries/recordings";
import { uploadQueueStore } from "@/stores/upload-queue";

export interface UploadRecordingParams {
	uri: string;
	durationSeconds: number;
	recordedAt?: Date;
}

const MAX_RETRIES = 3;

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

/**
 * Processes the upload queue, retrying failed uploads.
 * Should be called when network connectivity is restored or on app foreground.
 *
 * This is the orchestration function that coordinates:
 * - Reading pending items from the upload queue store
 * - Calling the upload function for each item
 * - Updating store state based on results
 * - Invalidating query cache on success
 */
export async function processUploadQueue(): Promise<void> {
	const state = uploadQueueStore.getState();

	// Prevent concurrent processing
	if (state.isProcessing) {
		return;
	}

	// Get pending items that haven't exceeded max retries
	const pendingItems = state.queue.filter(
		(item) =>
			(item.status === "pending" || item.status === "failed") &&
			item.retryCount < MAX_RETRIES,
	);

	if (pendingItems.length === 0) {
		return;
	}

	uploadQueueStore.setState({ isProcessing: true });

	for (const item of pendingItems) {
		try {
			state.updateStatus(item.id, "uploading");

			// Upload using shared function
			await uploadRecording({
				uri: item.uri,
				durationSeconds: item.durationSeconds,
				recordedAt: item.recordedAt,
			});

			// Success - remove from queue and invalidate recordings cache
			uploadQueueStore.getState().removeFromQueue(item.id);
			queryClient.invalidateQueries({
				queryKey: recordingsQueryOptions().queryKey,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "Upload failed";

			// If it's a network error, stop processing and try later
			// Don't increment retry count for network errors (they're temporary)
			if (isNetworkError(error)) {
				uploadQueueStore
					.getState()
					.updateStatus(item.id, "pending", "Network unavailable");
				break;
			}

			// Check if it's an auth error (401/403) - don't burn retries
			const isAuthError =
				error instanceof Error &&
				(message.includes("401") ||
					message.includes("403") ||
					message.includes("Unauthorized") ||
					message.includes("Forbidden"));

			if (isAuthError) {
				// Reset to pending without incrementing retry count
				// Auth errors are usually temporary (session expired, etc.)
				uploadQueueStore
					.getState()
					.updateStatus(item.id, "pending", "Authentication required");
				break;
			}

			// Mark as failed for retry (only for actual server errors)
			uploadQueueStore.getState().updateStatus(item.id, "failed", message);
		}
	}

	uploadQueueStore.setState({ isProcessing: false });
}
