import { useColorScheme } from "@/hooks/use-color-scheme";
import { AlertKitColors } from "../theme";
import type { AlertPreset, ToastPreset } from "../types";

// Colorful icon colors (used by Toast and iOS16 Alert by default)
const COLORED_ICONS = {
  done: {
    light: "#34C759", // iOS green
    dark: "#30D158",
  },
  error: {
    light: "#FF3B30", // iOS red
    dark: "#FF453A",
  },
  heart: {
    light: "#FF2D55", // iOS pink
    dark: "#FF375F",
  },
} as const;

type Preset = AlertPreset | ToastPreset | undefined;

/**
 * Returns the appropriate icon color based on preset and coloredIcons preference.
 *
 * @param preset - The icon preset (done, error, heart, spinner, custom)
 * @param coloredIcons - Whether to use colorful icons or monochrome gray
 * @returns The hex color string for the icon
 *
 * Usage:
 * - Toast: coloredIcons defaults to true
 * - Alert iOS16: coloredIcons defaults to true
 * - Alert iOS17: coloredIcons defaults to false (uses AlertKit gray)
 */
export function useIconColor(preset: Preset, coloredIcons: boolean): string {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Monochrome gray (AlertKit style) - used for iOS17 alerts
  const monochromeColor = isDark
    ? AlertKitColors.dark.content
    : AlertKitColors.light.content;

  // If not using colored icons, return monochrome
  if (!coloredIcons) {
    return monochromeColor;
  }

  // Colorful icons based on preset
  switch (preset) {
    case "done":
      return isDark ? COLORED_ICONS.done.dark : COLORED_ICONS.done.light;
    case "error":
      return isDark ? COLORED_ICONS.error.dark : COLORED_ICONS.error.light;
    case "heart":
      return isDark ? COLORED_ICONS.heart.dark : COLORED_ICONS.heart.light;
    default:
      // Spinner, custom, and undefined presets use monochrome
      return monochromeColor;
  }
}

/**
 * Returns the AlertKit content color for text in alerts.
 * This is the same gray used for icons in iOS17 style.
 */
export function useAlertKitContentColor(): string {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return isDark ? AlertKitColors.dark.content : AlertKitColors.light.content;
}
