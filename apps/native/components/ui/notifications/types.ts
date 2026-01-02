import type { ReactNode } from "react";
import type { TextStyle, ViewStyle } from "react-native";

// ============ SHARED ============

export type HapticType = "success" | "error" | "warning" | "none";

// ============ TOAST ============

export type ToastPreset = "done" | "error" | "spinner" | "custom";
export type ToastPosition = "top" | "bottom";

export interface ToastConfig {
  id: string;
  title: string;
  message?: string;
  preset?: ToastPreset;
  /** Custom icon (overrides preset) */
  icon?: ReactNode;
  /** Position on screen. Default: 'top' */
  position?: ToastPosition;
  /** Auto-dismiss duration in ms. Default: 2000. Use Infinity for no auto-dismiss */
  duration?: number;
  /** Haptic feedback type. Default: based on preset */
  haptic?: HapticType;
  /** Allow swipe to dismiss. Default: true */
  dismissible?: boolean;
  /** Callback when toast is dismissed */
  onDismiss?: () => void;
  /**
   * Force toast display even when content would normally trigger Alert.
   * When false/undefined, long content (>60 chars combined) auto-switches to Alert.
   * Default: false
   */
  forceToast?: boolean;
  // Styling
  style?: ViewStyle;
  titleStyle?: TextStyle;
  messageStyle?: TextStyle;
}

export type ToastInput = Omit<ToastConfig, "id"> & { id?: string };

export interface ToastMethods {
  (config: ToastInput): string;
  done: (
    title: string,
    options?: Omit<ToastInput, "title" | "preset">
  ) => string;
  error: (
    title: string,
    options?: Omit<ToastInput, "title" | "preset">
  ) => string;
  loading: (
    title: string,
    options?: Omit<ToastInput, "title" | "preset">
  ) => string;
  dismiss: (id?: string) => void;
}

// ============ ALERT ============

export type AlertPreset = "done" | "error" | "heart" | "spinner" | "custom";

export interface AlertConfig {
  id: string;
  title: string;
  message?: string;
  preset?: AlertPreset;
  /** Custom icon (overrides preset) */
  icon?: ReactNode;
  /** Auto-dismiss duration in ms. Default: 2500 */
  duration?: number;
  /** Haptic feedback type. Default: based on preset */
  haptic?: HapticType;
  /** Callback when alert is dismissed */
  onDismiss?: () => void;
  // Styling
  style?: ViewStyle;
  titleStyle?: TextStyle;
  messageStyle?: TextStyle;
}

export type AlertInput = Omit<AlertConfig, "id"> & { id?: string };

export interface AlertMethods {
  (config: AlertInput): string;
  done: (
    title: string,
    options?: Omit<AlertInput, "title" | "preset">
  ) => string;
  error: (
    title: string,
    options?: Omit<AlertInput, "title" | "preset">
  ) => string;
  heart: (
    title: string,
    options?: Omit<AlertInput, "title" | "preset">
  ) => string;
  loading: (
    title: string,
    options?: Omit<AlertInput, "title" | "preset">
  ) => string;
  dismiss: (id?: string) => void;
}

// ============ CONTEXT ============

export interface NotificationContextValue {
  // Toast
  addToast: (config: ToastInput) => string;
  dismissToast: (id?: string) => void;
  // Alert
  addAlert: (config: AlertInput) => string;
  dismissAlert: (id?: string) => void;
}

// ============ ICONS ============

export interface IconProps {
  size?: number;
  color: string;
}
