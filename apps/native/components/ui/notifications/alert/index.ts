import { getAlertRef } from "../context";
import type { AlertInput, AlertMethods } from "../types";

/**
 * Generate a unique alert ID
 */
function generateId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Show an alert notification
 */
function showAlert(config: AlertInput): string {
  const ref = getAlertRef();
  return ref.addAlert(config);
}

/**
 * Dismiss an alert by ID, or dismiss current alert if no ID provided
 */
function dismissAlert(id?: string): void {
  const ref = getAlertRef();
  ref.dismissAlert(id);
}

/**
 * Imperative alert API
 *
 * @example
 * // Basic usage
 * alert({ title: "Added to Library", preset: "done" });
 *
 * // Convenience methods
 * alert.done("Saved!");
 * alert.error("Something went wrong");
 * alert.heart("Added to Favorites");
 *
 * // With iOS17 Apple Music style (bottom-positioned, horizontal layout)
 * alert.done("Added!", { alertStyle: "iOS17AppleMusic" });
 *
 * // Override icon colors (e.g., use colored icons in iOS17 style)
 * alert.done("Saved!", { alertStyle: "iOS17AppleMusic", coloredIcons: true });
 *
 * // Dismiss
 * alert.dismiss();
 */
export const alert: AlertMethods = Object.assign(
  (config: AlertInput): string => {
    return showAlert({
      ...config,
      id: config.id ?? generateId(),
    });
  },
  {
    done: (
      title: string,
      options?: Omit<AlertInput, "title" | "preset">
    ): string => {
      return showAlert({
        ...options,
        id: options?.id ?? generateId(),
        title,
        preset: "done",
      });
    },

    error: (
      title: string,
      options?: Omit<AlertInput, "title" | "preset">
    ): string => {
      return showAlert({
        ...options,
        id: options?.id ?? generateId(),
        title,
        preset: "error",
      });
    },

    heart: (
      title: string,
      options?: Omit<AlertInput, "title" | "preset">
    ): string => {
      return showAlert({
        ...options,
        id: options?.id ?? generateId(),
        title,
        preset: "heart",
      });
    },

    loading: (
      title: string,
      options?: Omit<AlertInput, "title" | "preset">
    ): string => {
      return showAlert({
        ...options,
        id: options?.id ?? generateId(),
        title,
        preset: "spinner",
        duration: Number.POSITIVE_INFINITY, // Loading alerts don't auto-dismiss
      });
    },

    dismiss: dismissAlert,
  }
);
