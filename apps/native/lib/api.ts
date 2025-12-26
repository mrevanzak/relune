import { treaty } from "@elysiajs/eden";
import { env } from "@relune/env";
import { fetch } from "expo/fetch";
import type { App } from "server";
import { getSupabaseClient } from "./supabase";

const API_URL = env.EXPO_PUBLIC_API_URL;

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
	// fetcher: (input, init) => {
	// 	return fetch(input as string, init);
	// },
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
