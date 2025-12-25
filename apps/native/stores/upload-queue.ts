import { randomUUID } from "expo-crypto";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api, isNetworkError } from "@/lib/api";
import { uriToFile } from "@/lib/file-utils";
import { createSelectors } from "@/lib/utils";
import { zustandStorage } from "@/lib/zustand-storage";

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
	clearCompleted: () => void;
}

const MAX_RETRIES = 3;

const useUploadQueueStoreBase = create<UploadQueueState>()(
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

			clearCompleted: () => {
				set((state) => ({
					queue: state.queue.filter((item) => item.status !== "pending"),
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

						// Convert URI to File
						const file = await uriToFile(item.uri);

						// Upload via API
						const response = await api.recordings.post({
							file,
							durationSeconds: item.durationSeconds,
							recordedAt: item.recordedAt,
						});

						if (response.error) {
							throw new Error(
								typeof response.error.value === "string"
									? response.error.value
									: "Upload failed",
							);
						}

						// Success - remove from queue
						get().removeFromQueue(item.id);
					} catch (error) {
						const message =
							error instanceof Error ? error.message : "Upload failed";

						// If it's a network error, stop processing and try later
						if (isNetworkError(error)) {
							get().updateStatus(item.id, "pending", "Network unavailable");
							break;
						}

						// Mark as failed for retry
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
		},
	),
);

export const useUploadQueueStore = createSelectors(useUploadQueueStoreBase);
