import { Platform } from "react-native";
import { createMMKV, type MMKV } from "react-native-mmkv";
import { getOrCreateMmkvKey } from "./mmkv-keychain";

let mmkvInstance: MMKV | null = null;
let initPromise: Promise<MMKV> | null = null;

/**
 * Initializes the encrypted MMKV storage instance.
 * On web, returns null (use localStorage instead).
 * Subsequent calls return the same instance.
 */
export async function initMmkv(): Promise<MMKV | null> {
	if (Platform.OS === "web") {
		return null;
	}

	if (mmkvInstance) {
		return mmkvInstance;
	}

	if (initPromise) {
		return initPromise;
	}

	initPromise = (async () => {
		const encryptionKey = await getOrCreateMmkvKey();
		if (!encryptionKey) {
			throw new Error("Failed to get MMKV encryption key");
		}

		mmkvInstance = createMMKV({
			id: "relune",
			encryptionKey,
		});

		return mmkvInstance;
	})();

	return initPromise;
}

/**
 * Gets the MMKV instance if it's been initialized.
 * Returns null if not initialized or on web.
 */
export function getMmkv(): MMKV | null {
	return mmkvInstance;
}
