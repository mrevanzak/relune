import * as Haptics from "expo-haptics";
import type { AlertPreset, HapticType, ToastPreset } from "./types";

/**
 * Trigger haptic feedback based on type
 */
export async function triggerHaptic(type: HapticType): Promise<void> {
  switch (type) {
    case "success":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case "error":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    case "warning":
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    default:
      // No haptic for "none" or unknown types
      break;
  }
}

/**
 * Get default haptic type for a toast preset
 */
export function getToastHaptic(preset?: ToastPreset): HapticType {
  if (preset === "done") return "success";
  if (preset === "error") return "error";
  return "none";
}

/**
 * Get default haptic type for an alert preset
 */
export function getAlertHaptic(preset?: AlertPreset): HapticType {
  if (preset === "done" || preset === "heart") return "success";
  if (preset === "error") return "error";
  return "none";
}
