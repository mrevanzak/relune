import { getMmkv } from "./mmkv";

type OnNativeUnavailable = "throw" | "tolerant";

interface PlatformStorageOptions {
  /**
   * Behavior when MMKV is not initialized on native platforms.
   * - "throw": throw an error (for Supabase storage)
   * - "tolerant": return null/noop (for Zustand hydration)
   */
  onNativeUnavailable: OnNativeUnavailable;
}

interface SyncStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

/**
 * Creates a platform-agnostic storage adapter.
 * Uses localStorage on web, MMKV on native platforms.
 */
export function createPlatformStorage(
  options: PlatformStorageOptions
): SyncStorage {
  const { onNativeUnavailable } = options;

  return {
    getItem: (key: string): string | null => {
      const mmkv = getMmkv();
      if (!mmkv) {
        if (onNativeUnavailable === "throw") {
          throw new Error("MMKV not initialized. Call initMmkv() first.");
        }
        return null;
      }

      const value = mmkv.getString(key);
      return value ?? null;
    },

    setItem: (key: string, value: string): void => {
      const mmkv = getMmkv();
      if (!mmkv) {
        if (onNativeUnavailable === "throw") {
          throw new Error("MMKV not initialized. Call initMmkv() first.");
        }
        // Tolerant mode: silently fail during initialization
        return;
      }

      mmkv.set(key, value);
    },

    removeItem: (key: string): void => {
      const mmkv = getMmkv();
      if (!mmkv) {
        if (onNativeUnavailable === "throw") {
          throw new Error("MMKV not initialized. Call initMmkv() first.");
        }
        // Tolerant mode: silently fail during initialization
        return;
      }

      mmkv.remove(key);
    },
  };
}
