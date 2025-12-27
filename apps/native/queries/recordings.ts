import { queryOptions } from "@tanstack/react-query";
import type { ListRecordingsParam } from "server/src/modules/recordings/model";
import type { RecordingWithKeywords } from "server/src/modules/recordings/service";
import { api } from "@/lib/api";

export const recordingsQueryOptions = (params?: ListRecordingsParam) =>
	queryOptions({
		queryKey: ["recordings", params],
		queryFn: async () => {
			const { data, error } = await api.recordings.get({ query: params });
			if (error) {
				throw new Error(error.value?.message ?? "Failed to fetch recordings");
			}

			if ("error" in data) {
				const errorData = data.error as { message?: string };
				throw new Error(errorData.message ?? "Failed to fetch recordings");
			}

			return data;
		},
	});

export const recordingQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["recordings", id],
		queryFn: async (): Promise<RecordingWithKeywords> => {
			const { data, error } = await api.recordings({ id }).get();

			if (error) {
				throw new Error(error.value?.message ?? "Failed to fetch recording");
			}

			if ("error" in data) {
				const errorData = data.error as { message?: string };
				throw new Error(errorData.message ?? "Failed to fetch recording");
			}

			if (!data.recording) {
				throw new Error("Recording not found");
			}

			return data.recording;
		},
		enabled: id.length > 0,
	});
