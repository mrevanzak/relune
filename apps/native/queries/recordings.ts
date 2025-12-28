import { orpc } from "@/lib/api";

/**
 * Query options for fetching recordings list.
 *
 * @param params - Optional pagination and search params
 * @returns queryOptions compatible with useQuery()
 *
 * @example
 * ```typescript
 * const { data, isLoading } = useQuery(recordingsQueryOptions({ limit: 20 }));
 * ```
 */
export const recordingsQueryOptions = (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) =>
  orpc.recordings.list.queryOptions({
    input: {
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
      search: params?.search,
    },
  });

/**
 * Query options for fetching a single recording.
 *
 * @param id - Recording UUID
 * @returns queryOptions compatible with useQuery()
 *
 * @example
 * ```typescript
 * const { data, isLoading } = useQuery(recordingQueryOptions("uuid"));
 * ```
 */
export const recordingQueryOptions = (id: string) =>
  orpc.recordings.get.queryOptions({
    input: { id },
    enabled: id.length > 0,
  });

/**
 * Type exports for use in components.
 * These are inferred from the oRPC client types.
 */
export type RecordingWithKeywords = Awaited<
  ReturnType<typeof orpc.recordings.get.queryOptions>
>["queryFn"] extends () => Promise<infer T>
  ? T
  : never;

export type ListRecordingsResult = Awaited<
  ReturnType<typeof orpc.recordings.list.queryOptions>
>["queryFn"] extends () => Promise<infer T>
  ? T
  : never;
