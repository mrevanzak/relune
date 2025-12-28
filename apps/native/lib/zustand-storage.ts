import type { StateStorage } from "zustand/middleware";
import { createPlatformStorage } from "./platform-storage";

/**
 * Zustand StateStorage adapter.
 * Uses MMKV on native platforms, localStorage on web.
 * Synchronous API for better performance with Zustand.
 * Tolerant of MMKV not being initialized during early app boot.
 */
const platformStorage = createPlatformStorage({
  onNativeUnavailable: "tolerant",
});

export const zustandStorage: StateStorage = platformStorage;
