import { getAlertRef, getToastRef } from "../context";
import type { ToastInput, ToastMethods } from "../types";

/**
 * Character threshold for auto-switching to Alert.
 * If title + message combined length exceeds this, use Alert instead of Toast.
 */
const AUTO_SWITCH_THRESHOLD = 60;

/**
 * Check if content should auto-switch to Alert
 */
function shouldUseAlert(config: ToastInput): boolean {
  if (config.forceToast) return false;
  if (!config.message) return false;

  const combinedLength = config.title.length + (config.message?.length ?? 0);
  return combinedLength > AUTO_SWITCH_THRESHOLD;
}

/**
 * Generate a unique toast ID
 */
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Show a toast notification.
 * If content is long and forceToast is not set, automatically uses Alert instead.
 */
function showToast(config: ToastInput): string {
  // Auto-switch to Alert for long content
  if (shouldUseAlert(config)) {
    const alertRef = getAlertRef();
    // Destructure to remove toast-specific props that Alert doesn't use
    const { position, dismissible, forceToast, ...alertConfig } = config;
    return alertRef.addAlert(alertConfig);
  }

  const ref = getToastRef();
  return ref.addToast(config);
}

/**
 * Dismiss a toast by ID, or dismiss current toast if no ID provided
 */
function dismissToast(id?: string): void {
  const ref = getToastRef();
  ref.dismissToast(id);
}

/**
 * Imperative toast API
 *
 * @example
 * // Basic usage
 * toast({ title: "Hello", preset: "done" });
 *
 * // Convenience methods
 * toast.done("Saved!");
 * toast.error("Failed to save");
 * toast.loading("Processing...");
 *
 * // Dismiss
 * toast.dismiss();
 */
export const toast: ToastMethods = Object.assign(
  (config: ToastInput): string => {
    return showToast({
      ...config,
      id: config.id ?? generateId(),
    });
  },
  {
    done: (
      title: string,
      options?: Omit<ToastInput, "title" | "preset">
    ): string => {
      return showToast({
        ...options,
        id: options?.id ?? generateId(),
        title,
        preset: "done",
      });
    },

    error: (
      title: string,
      options?: Omit<ToastInput, "title" | "preset">
    ): string => {
      return showToast({
        ...options,
        id: options?.id ?? generateId(),
        title,
        preset: "error",
      });
    },

    loading: (
      title: string,
      options?: Omit<ToastInput, "title" | "preset">
    ): string => {
      return showToast({
        ...options,
        id: options?.id ?? generateId(),
        title,
        preset: "spinner",
        duration: Number.POSITIVE_INFINITY, // Loading toasts don't auto-dismiss
        dismissible: false,
      });
    },

    dismiss: dismissToast,
  }
);
