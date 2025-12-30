import type { ListRecordingsInput } from "@relune/api/models/recordings";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { orpc } from "@/lib/api";

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
  return useMutation(
    orpc.recordings.delete.mutationOptions({
      onSuccess: (_, _variables, _onMutateResult, context) => {
        // Invalidate recordings list
        context.client.invalidateQueries({
          queryKey: orpc.recordings.list.key(),
        });
      },
    })
  );
}

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
  return useMutation(
    orpc.recordings.update.mutationOptions({
      onSuccess: (_, _variables, _onMutateResult, context) => {
        // Invalidate recordings list
        context.client.invalidateQueries({
          queryKey: orpc.recordings.get.key(),
        });
      },
    })
  );
}

/**
 * Mutation hook for archiving a recording.
 * Moves recording to Archived tab.
 *
 * @example
 * ```typescript
 * const { mutate } = useArchiveRecordingMutation();
 * mutate({ id: "uuid" });
 * ```
 */
export function useArchiveRecordingMutation() {
  return useMutation(
    orpc.recordings.archive.mutationOptions({
      onSuccess: (_, _variables, _onMutateResult, context) => {
        // Invalidate recordings list
        context.client.invalidateQueries({
          queryKey: orpc.recordings.list.key(),
        });
      },
    })
  );
}

/**
 * Mutation hook for unarchiving a recording.
 * Moves recording back to Current tab.
 *
 * @example
 * ```typescript
 * const { mutate } = useUnarchiveRecordingMutation();
 * mutate({ id: "uuid" });
 * ```
 */
export function useUnarchiveRecordingMutation() {
  return useMutation(
    orpc.recordings.unarchive.mutationOptions({
      onSuccess: (_, _variables, _onMutateResult, context) => {
        // Invalidate recordings list
        context.client.invalidateQueries({
          queryKey: orpc.recordings.list.key(),
        });
      },
    })
  );
}

const POLLING_INTERVAL_MS = 3000;
const POLLING_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Hook that fetches recordings and automatically polls when there are
 * pending transcriptions. Stops polling after timeout to handle failed transcriptions.
 */
export function useRecordingsWithPolling(
  params?: Partial<ListRecordingsInput>
) {
  const query = useQuery(orpc.recordings.list.queryOptions({ input: params }));

  // Track when we started polling
  const pollingStartRef = useRef<number | null>(null);

  // Check if any recordings are pending transcription
  const hasPendingTranscriptions =
    query.data?.some(
      (r) => r.transcript === null || r.transcript === undefined
    ) ?? false;

  // Determine if we should still be polling (not timed out)
  const now = Date.now();
  if (hasPendingTranscriptions && pollingStartRef.current === null) {
    pollingStartRef.current = now;
  }
  if (!hasPendingTranscriptions) {
    pollingStartRef.current = null;
  }

  const pollingTimedOut =
    pollingStartRef.current !== null &&
    now - pollingStartRef.current > POLLING_TIMEOUT_MS;

  const shouldPoll = hasPendingTranscriptions && !pollingTimedOut;

  // Use a separate query for polling to avoid re-creating the main query
  useQuery(
    orpc.recordings.list.queryOptions({
      input: params,
      refetchInterval: shouldPoll ? POLLING_INTERVAL_MS : false,
      refetchIntervalInBackground: false,
    })
  );

  return {
    ...query,
    hasPendingTranscriptions,
    isPolling: shouldPoll,
  };
}
