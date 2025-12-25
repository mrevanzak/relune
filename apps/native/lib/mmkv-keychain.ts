import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import * as Keychain from "react-native-keychain";

const KEYCHAIN_SERVICE = "com.mrevanzak.relune.mmkv-key";
const KEY_LENGTH = 16; // MMKV encryption keys should be up to 16 bytes

/**
 * Generates a random 16-character encryption key using a 64-character alphabet.
 * Uses expo-crypto for cryptographically secure random bytes.
 */
async function generateEncryptionKey(): Promise<string> {
	const bytes = await Crypto.getRandomBytesAsync(KEY_LENGTH);
	// Use base64url alphabet (64 chars: A-Z, a-z, 0-9, -, _)
	// This ensures uniform distribution
	const alphabet =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	let key = "";
	for (let i = 0; i < KEY_LENGTH; i++) {
		key += alphabet[bytes[i] % alphabet.length];
	}
	return key;
}

/**
 * Gets or creates the MMKV encryption key stored in Keychain/Keystore.
 * On web, returns null (no Keychain support).
 */
export async function getOrCreateMmkvKey(): Promise<string | null> {
	if (Platform.OS === "web") {
		return null;
	}

	try {
		const credentials = await Keychain.getGenericPassword({
			service: KEYCHAIN_SERVICE,
		});

		if (
			credentials &&
			typeof credentials === "object" &&
			credentials.password
		) {
			return credentials.password;
		}

		// Key doesn't exist, generate and store it
		const newKey = await generateEncryptionKey();
		await Keychain.setGenericPassword("mmkv-key", newKey, {
			service: KEYCHAIN_SERVICE,
		});

		return newKey;
	} catch (error) {
		console.error("Failed to get or create MMKV encryption key:", error);
		throw error;
	}
}
