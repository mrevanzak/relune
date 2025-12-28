import { useMutation } from "@tanstack/react-query";
import type { UpdateRecordingBody } from "server/src/modules/recordings/model";
import type { RecordingWithKeywords } from "server/src/modules/recordings/service";
import { api, getErrorMessage } from "@/lib/api";

/**
 * Recordings feature: mutations and workflows for recordings management
 * Orchestrates queries + stores + API calls
 */

export function useDeleteRecordingMutation() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.recordings({ id }).delete();

      if (error) {
        throw new Error(
          getErrorMessage(error.value, "Failed to delete recording")
        );
      }

      if ("error" in data) {
        throw new Error(getErrorMessage(data, "Failed to delete recording"));
      }

      return data;
    },
    onSuccess: (_, id, _onMutateResult, context) => {
      // Optimistically remove from cache
      context.client.setQueryData(
        ["recordings"],
        (old: RecordingWithKeywords[] | undefined) => {
          if (!old) return old;
          return old.filter((item) => item.id !== id);
        }
      );
      // Invalidate recordings list query
      context.client.invalidateQueries({ queryKey: ["recordings"] });

      // Also invalidate specific recording query
      context.client.invalidateQueries({ queryKey: ["recordings", id] });
    },
  });
}

export type UpdateRecordingParams = {
  id: string;
} & UpdateRecordingBody;

export function useUpdateRecordingMutation() {
  return useMutation({
    mutationFn: async ({ id, recordedAt, keywords }: UpdateRecordingParams) => {
      const { data, error } = await api.recordings({ id }).patch({
        recordedAt,
        keywords,
      });

      if (error) {
        throw new Error(
          getErrorMessage(error.value, "Failed to update recording")
        );
      }

      if ("error" in data) {
        throw new Error(getErrorMessage(data, "Failed to update recording"));
      }

      return data;
    },
    onSuccess: (_, _variables, _onMutateResult, context) => {
      // Invalidate recordings list query to refetch
      context.client.invalidateQueries({ queryKey: ["recordings"] });
    },
  });
}
