import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@relune/api/routers/index";
import { env } from "@relune/env";
import { QueryCache, QueryClient } from "@tanstack/react-query";

import { getSupabaseClient } from "./supabase";

/**
 * React Query client with error logging.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.error("[Query Error]", error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

/**
 * oRPC link with automatic auth header injection.
 *
 * Extracts the current Supabase session token and includes it
 * in the Authorization header for all RPC calls.
 */
export const link = new RPCLink({
  url: `${env.EXPO_PUBLIC_API_URL}/rpc`,
  headers: async () => {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  },
});

/**
 * Type-safe oRPC client.
 *
 * @example
 * ```typescript
 * // Direct call
 * const recordings = await client.recordings.list({ limit: 20 });
 *
 * // With TanStack Query
 * const { data } = useQuery(orpc.recordings.list.queryOptions({ input: { limit: 20 } }));
 * ```
 */
export const client: AppRouterClient = createORPCClient(link);

/**
 * TanStack Query utilities for oRPC.
 *
 * Provides .queryOptions() and .mutationOptions() for all procedures.
 *
 * @example
 * ```typescript
 * // Query
 * const { data } = useQuery(orpc.recordings.list.queryOptions({ input: { limit: 20 } }));
 *
 * // Mutation
 * const mutation = useMutation(orpc.recordings.delete.mutationOptions());
 * mutation.mutate({ id: "uuid" });
 * ```
 */
export const orpc = createTanstackQueryUtils(client);

/**
 * Helper to check if an error is a network error (offline).
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error && error.message === "Network request failed") {
    return true;
  }
  return false;
}

/**
 * Extract error message from oRPC error.
 * Handles ORPCError structure: { message, code, data }
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "object" && "message" in error) {
    const msg = (error as { message?: string }).message;
    if (msg) return msg;
  }

  return fallback;
}
