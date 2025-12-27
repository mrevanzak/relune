import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
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
 * On network error: caller should queue via uploadQueueStore.
 *
 * Usage:
 * ```tsx
 * const mutation = useUploadRecordingMutation();
 *
 * mutation.mutate(params, {
 *   onError: (error) => {
 *     if (isNetworkError(error)) {
 *       addToQueue({ ... });
 *     }
 *   },
 * });
 *
 * // Retry from error state:
 * if (mutation.isError && mutation.variables) {
 *   mutation.mutate(mutation.variables);
 * }
 * ```
 */
export function useUploadRecordingMutation() {
	return useMutation({
		mutationFn: async (params: UploadRecordingParams) => {
			return uploadRecording({
				uri: params.uri,
				durationSeconds: params.durationSeconds,
				recordedAt: (params.recordedAt ?? new Date()).toISOString(),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: recordingsQueryOptions().queryKey,
			});
		},
	});
}

/**
 * Hook that returns a function to process the upload queue.
 * Retries failed uploads when called (e.g., on app foreground, network restore).
 *
 * Uses mutation internally for each queue item to get proper state tracking.
 */
export function useProcessUploadQueue() {
	const isProcessingRef = useRef(false);

	const processQueue = useCallback(async (): Promise<void> => {
		const state = uploadQueueStore.getState();

		// Prevent concurrent processing
		if (isProcessingRef.current || state.isProcessing) {
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

		isProcessingRef.current = true;
		uploadQueueStore.setState({ isProcessing: true });

		for (const item of pendingItems) {
			try {
				uploadQueueStore.getState().updateStatus(item.id, "uploading");

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
				const message =
					error instanceof Error ? error.message : "Upload failed";

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
		isProcessingRef.current = false;
	}, []);

	return { processQueue };
}
