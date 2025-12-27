import { useMutation } from "@tanstack/react-query";
import type { RecordingWithKeywords } from "server/src/modules/recordings/service";
import { api } from "@/lib/api";

/**
 * Recordings feature: mutations and workflows for recordings management
 * Orchestrates queries + stores + API calls
 */

export function useDeleteRecordingMutation() {
	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await api.recordings({ id }).delete();

			if (error) {
				throw new Error(error.value?.message ?? "Failed to delete recording");
			}

			if ("error" in data) {
				const errorData = data.error;
				throw new Error(errorData.message ?? "Failed to delete recording");
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
				},
			);
			// Invalidate recordings list query
			context.client.invalidateQueries({ queryKey: ["recordings"] });

			// Also invalidate specific recording query
			context.client.invalidateQueries({ queryKey: ["recordings", id] });
		},
	});
}
