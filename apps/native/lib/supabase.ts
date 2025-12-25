import "react-native-url-polyfill/auto";
import { env } from "@relune/env";
import {
	createClient,
	processLock,
	type SupabaseClient,
} from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { supabaseStorage } from "./supabase-storage";

const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let supabaseInstance: SupabaseClient | null = null;

/**
 * Creates and returns the Supabase client instance.
 * Must be called after MMKV storage is initialized (on native platforms).
 * On web, can be called immediately.
 */
export function getSupabaseClient(): SupabaseClient {
	if (supabaseInstance) {
		return supabaseInstance;
	}

	supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
		auth: {
			storage: supabaseStorage,
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: false,
			lock: processLock,
		},
	});

	return supabaseInstance;
}

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
if (Platform.OS !== "web") {
	AppState.addEventListener("change", (state) => {
		const supabase = getSupabaseClient();

		if (state === "active") {
			supabase.auth.startAutoRefresh();
		} else {
			supabase.auth.stopAutoRefresh();
		}
	});
}
