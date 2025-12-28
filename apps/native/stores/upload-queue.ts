import { randomUUID } from "expo-crypto";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createSelectors } from "@/lib/utils";
import { zustandStorage } from "@/lib/zustand-storage";

/**
 * Represents a recording queued for upload
 */
export interface QueuedUpload {
  id: string;
  uri: string;
  durationSeconds: number;
  recordedAt: Date;
  status: "pending" | "uploading" | "failed";
  retryCount: number;
  lastError?: string;
}

interface UploadQueueState {
  queue: QueuedUpload[];
  isProcessing: boolean;

  // Actions (pure state mutations only - no async workflows)
  addToQueue: (
    upload: Omit<QueuedUpload, "id" | "status" | "retryCount">
  ) => void;
  removeFromQueue: (id: string) => void;
  updateStatus: (
    id: string,
    status: QueuedUpload["status"],
    error?: string
  ) => void;
  clearExhausted: () => void;
}

const MAX_RETRIES = 3;

const uploadQueueStoreBase = create<UploadQueueState>()(
  persist(
    (set) => ({
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
              : item
          ),
        }));
      },

      clearExhausted: () => {
        set((state) => ({
          queue: state.queue.filter((item) => item.retryCount < MAX_RETRIES),
        }));
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
    }
  )
);

export const uploadQueueStore = createSelectors(uploadQueueStoreBase);
