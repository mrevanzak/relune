import "react-native-url-polyfill/auto";
import { env } from "@relune/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
		},
	});

	return supabaseInstance;
}
