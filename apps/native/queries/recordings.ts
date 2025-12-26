import { queryOptions } from "@tanstack/react-query";
import type { ListRecordingsParam } from "server/src/modules/recordings/model";
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
