import { randomUUID } from "expo-crypto";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isNetworkError } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { uploadRecording } from "@/lib/upload-recording";
import { createSelectors } from "@/lib/utils";
import { zustandStorage } from "@/lib/zustand-storage";
import { recordingsQueryOptions } from "@/queries/recordings";

/**
 * Represents a recording queued for upload
 */
export interface QueuedUpload {
	id: string;
	uri: string;
	durationSeconds: number;
	recordedAt: string; // ISO 8601
	status: "pending" | "uploading" | "failed";
	retryCount: number;
	lastError?: string;
}

interface UploadQueueState {
	queue: QueuedUpload[];
	isProcessing: boolean;

	// Actions
	addToQueue: (
		upload: Omit<QueuedUpload, "id" | "status" | "retryCount">,
	) => void;
	removeFromQueue: (id: string) => void;
	updateStatus: (
		id: string,
		status: QueuedUpload["status"],
		error?: string,
	) => void;
	processQueue: () => Promise<void>;
	clearExhausted: () => void;
}

const MAX_RETRIES = 3;

const uploadQueueStoreBase = create<UploadQueueState>()(
	persist(
		(set, get) => ({
			queue: [],
			isProcessing: false,

			addToQueue: (upload) => {
				const newUpload: QueuedUpload = {
					...upload,
					id: randomUUID(),
					status: "pending",
					retryCount: 0,
				};
				set((state) => ({
					queue: [...state.queue, newUpload],
				}));
			},

			removeFromQueue: (id) => {
				set((state) => ({
					queue: state.queue.filter((item) => item.id !== id),
				}));
			},

			updateStatus: (id, status, error) => {
				set((state) => ({
					queue: state.queue.map((item) =>
						item.id === id
							? {
									...item,
									status,
									lastError: error,
									retryCount:
										status === "failed" ? item.retryCount + 1 : item.retryCount,
								}
							: item,
					),
				}));
			},

			clearExhausted: () => {
				set((state) => ({
					queue: state.queue.filter((item) => item.retryCount < MAX_RETRIES),
				}));
			},

			processQueue: async () => {
				const state = get();

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

				set({ isProcessing: true });

				for (const item of pendingItems) {
					try {
						get().updateStatus(item.id, "uploading");

						// Upload using shared function
						await uploadRecording({
							uri: item.uri,
							durationSeconds: item.durationSeconds,
							recordedAt: item.recordedAt,
						});

						// Success - remove from queue and invalidate recordings cache
						get().removeFromQueue(item.id);
						queryClient.invalidateQueries({
							queryKey: recordingsQueryOptions().queryKey,
						});
					} catch (error) {
						const message =
							error instanceof Error ? error.message : "Upload failed";

						// If it's a network error, stop processing and try later
						// Don't increment retry count for network errors (they're temporary)
						if (isNetworkError(error)) {
							get().updateStatus(item.id, "pending", "Network unavailable");
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
							get().updateStatus(item.id, "pending", "Authentication required");
							break;
						}

						// Mark as failed for retry (only for actual server errors)
						get().updateStatus(item.id, "failed", message);
					}
				}

				set({ isProcessing: false });
			},
		}),
		{
			name: "upload-queue-store",
			storage: createJSONStorage(() => zustandStorage),
			// Only persist the queue, not the processing state
			partialize: (state) => ({ queue: state.queue }),
			onRehydrateStorage: () => (state) => {
				// Repair stuck "uploading" items after app restart/kill
				// These items were mid-upload when the app was terminated
				if (state) {
					const repairedQueue = state.queue.map((item) => {
						if (item.status === "uploading") {
							return {
								...item,
								status: "pending" as const,
								lastError: "App restarted during upload",
							};
						}
						return item;
					});
					state.queue = repairedQueue;
				}
			},
		},
	),
);

export const uploadQueueStore = createSelectors(uploadQueueStoreBase);
