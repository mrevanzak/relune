/**
 * Notification components - Toast and Alert
 *
 * Based on SPIndicator and AlertKit for iOS-native look and feel
 *
 * @example
 * // Setup: Wrap your app with the provider
 * import { NotificationProvider } from '@/components/ui/notifications';
 *
 * export default function App() {
 *   return (
 *     <NotificationProvider>
 *       <YourApp />
 *     </NotificationProvider>
 *   );
 * }
 *
 * @example
 * // Usage: Show toasts and alerts from anywhere
 * import { toast, alert } from '@/components/ui/notifications';
 *
 * // Toast (small floating pill)
 * toast.done("Saved!");
 * toast.error("Failed to save");
 * toast.loading("Processing...");
 * toast({ title: "Custom", message: "With message", preset: "done" });
 *
 * // Force toast for long content (prevent auto-switch to Alert)
 * toast({
 *   title: "Updates not available",
 *   message: "OTA updates are disabled in development mode",
 *   preset: "error",
 *   forceToast: true,
 * });
 *
 * // Alert (centered modal popup)
 * alert.done("Added to Library");
 * alert.error("Something went wrong");
 * alert.heart("Added to Favorites");
 * alert({ title: "Custom", message: "With message", preset: "done" });
 *
 * // Dismiss
 * toast.dismiss();
 * alert.dismiss();
 */

export { alert } from "./alert";
// Hook for programmatic access
export { useNotifications } from "./context";
// Provider - wrap app root
export { NotificationProvider } from "./Provider";
// Imperative APIs
export { toast } from "./toast";

// Types
export type {
  AlertConfig,
  AlertInput,
  AlertPreset,
  HapticType,
  ToastConfig,
  ToastInput,
  ToastPosition,
  ToastPreset,
} from "./types";
