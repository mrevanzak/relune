import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client, orpc } from "@/lib/api";

/**
 * Recordings feature: mutations for recordings management.
 * Uses oRPC for type-safe API calls.
 */

/**
 * Mutation hook for deleting a recording.
 * Invalidates recordings list cache on success.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useDeleteRecordingMutation();
 * mutate("uuid", { onSuccess: () => navigation.goBack() });
 * ```
 */
export function useDeleteRecordingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return client.recordings.delete({ id });
    },
    onSuccess: (_, id) => {
      // Invalidate recordings list
      queryClient.invalidateQueries({
        queryKey: orpc.recordings.list.getQueryKey(),
      });
      // Also invalidate specific recording query
      queryClient.invalidateQueries({
        queryKey: orpc.recordings.get.getQueryKey({ input: { id } }),
      });
    },
  });
}

export type UpdateRecordingParams = {
  id: string;
  recordedAt?: string;
  keywords?: string[];
};

/**
 * Mutation hook for updating a recording's metadata.
 * Can update recordedAt timestamp and/or keywords.
 *
 * @example
 * ```typescript
 * const { mutate } = useUpdateRecordingMutation();
 * mutate({ id: "uuid", keywords: ["meeting", "notes"] });
 * ```
 */
export function useUpdateRecordingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, recordedAt, keywords }: UpdateRecordingParams) => {
      return client.recordings.update({ id, recordedAt, keywords });
    },
    onSuccess: (_, { id }) => {
      // Invalidate recordings list
      queryClient.invalidateQueries({
        queryKey: orpc.recordings.list.getQueryKey(),
      });
      // Also invalidate specific recording
      queryClient.invalidateQueries({
        queryKey: orpc.recordings.get.getQueryKey({ input: { id } }),
      });
    },
  });
}
