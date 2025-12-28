import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { ListRecordingsParam } from "server/src/modules/recordings/model";
import { recordingsQueryOptions } from "@/queries/recordings";

const POLLING_INTERVAL_MS = 3000;
const POLLING_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Hook that fetches recordings and automatically polls when there are
 * pending transcriptions. Stops polling after timeout to handle failed transcriptions.
 */
export function useRecordingsWithPolling(params?: ListRecordingsParam) {
  const query = useQuery(recordingsQueryOptions(params));

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
  useQuery({
    ...recordingsQueryOptions(params),
    refetchInterval: shouldPoll ? POLLING_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });

  // Reset polling timer when component unmounts
  useEffect(() => {
    return () => {
      pollingStartRef.current = null;
    };
  }, []);

  return {
    ...query,
    hasPendingTranscriptions,
    isPolling: shouldPoll,
  };
}
