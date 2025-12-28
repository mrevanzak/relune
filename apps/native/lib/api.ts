import { treaty } from "@elysiajs/eden";
import { env } from "@relune/env";
import type { App } from "server";
import { getSupabaseClient } from "./supabase";

const API_URL = env.EXPO_PUBLIC_API_URL;

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@relune/api/routers/index";
import { QueryCache, QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.log(error);
    },
  }),
});

export const link = new RPCLink({
  url: `${env.EXPO_PUBLIC_API_URL}/rpc`,
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);

/**
 * Type-safe API client using Eden Treaty.
 * Automatically includes auth headers from Supabase session.
 */
export const api = treaty<App>(API_URL, {
  headers: async (): Promise<Record<string, string>> => {
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
 * Helper to check if an error is a network error (offline)
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error && error.message === "Network request failed") {
    return true;
  }
  return false;
}

/**
 * Extract error message from Eden error response.
 * Handles both application errors ({ error: { message } }) and validation errors ({ message }).
 */
export function getErrorMessage(errorValue: unknown, fallback: string): string {
  if (!errorValue || typeof errorValue !== "object") {
    return fallback;
  }

  // Application error shape: { error: { message, code, status } }
  if ("error" in errorValue) {
    const appError = errorValue as { error?: { message?: string } };
    if (appError.error?.message) {
      return appError.error.message;
    }
  }

  // Validation error shape: { message, type, on }
  if ("message" in errorValue) {
    const validationError = errorValue as { message?: string };
    if (validationError.message) {
      return validationError.message;
    }
  }

  return fallback;
}
