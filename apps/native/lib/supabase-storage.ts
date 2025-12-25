import { createPlatformStorage } from "./platform-storage";

/**
 * Storage adapter for Supabase auth.
 * Uses MMKV on native platforms, localStorage on web.
 * All methods are async for compatibility with Supabase's storage interface.
 */
const platformStorage = createPlatformStorage({ onNativeUnavailable: "throw" });

export const supabaseStorage = {
	getItem: async (key: string): Promise<string | null> => {
		return Promise.resolve(platformStorage.getItem(key));
	},

	setItem: async (key: string, value: string): Promise<void> => {
		platformStorage.setItem(key, value);
		return Promise.resolve();
	},

	removeItem: async (key: string): Promise<void> => {
		platformStorage.removeItem(key);
		return Promise.resolve();
	},
};
