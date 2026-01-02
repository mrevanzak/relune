import type { ReactNode } from "react";
import type { TextStyle, ViewStyle } from "react-native";

// ============ SHARED ============

export type HapticType = "success" | "error" | "warning" | "none";

// ============ ALERT STYLES ============

/**
 * Alert visual styles matching AlertKit upstream library
 * - iOS16AppleMusic: Centered modal with large icon, backdrop (default)
 * - iOS17AppleMusic: Bottom-positioned horizontal layout, no backdrop
 */
export type AlertStyle = "iOS16AppleMusic" | "iOS17AppleMusic";

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
  /**
   * Use colored icons (green/red) instead of monochrome.
   * Default: true
   */
  coloredIcons?: boolean;
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

/** Base alert properties shared by all styles */
interface AlertConfigBase {
  id: string;
  title: string;
  message?: string;
  preset?: AlertPreset;
  /** Custom icon (overrides preset) */
  icon?: ReactNode;
  /**
   * Use colored icons (green/red/pink) instead of monochrome gray.
   * Default: true for iOS16AppleMusic, false for iOS17AppleMusic
   */
  coloredIcons?: boolean;
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

/** iOS16AppleMusic style - centered modal with backdrop */
interface AlertConfigiOS16 extends AlertConfigBase {
  /**
   * Alert visual style. Default: 'iOS16AppleMusic'
   * - iOS16AppleMusic: Centered modal with large icon, dimmed backdrop
   */
  alertStyle?: "iOS16AppleMusic";
  /**
   * Custom backdrop component for iOS16AppleMusic style.
   * Pass `() => null` to disable backdrop.
   * Default: animated dimmed backdrop (rgba(0,0,0,0.4))
   */
  backdropComponent?: () => ReactNode;
}

/** iOS17AppleMusic style - bottom-positioned, no backdrop */
interface AlertConfigiOS17 extends AlertConfigBase {
  /**
   * Alert visual style.
   * - iOS17AppleMusic: Bottom-positioned horizontal layout, no backdrop
   */
  alertStyle: "iOS17AppleMusic";
}

/** Discriminated union for alert configuration */
export type AlertConfig = AlertConfigiOS16 | AlertConfigiOS17;

/** Base alert input properties (without id) */
type AlertInputBase = Omit<AlertConfigBase, "id"> & { id?: string };

/** iOS16AppleMusic input - includes backdropComponent */
interface AlertInputiOS16 extends AlertInputBase {
  alertStyle?: "iOS16AppleMusic";
  /**
   * Custom backdrop component for iOS16AppleMusic style.
   * Pass `() => null` to disable backdrop.
   * Default: animated dimmed backdrop (rgba(0,0,0,0.4))
   */
  backdropComponent?: () => ReactNode;
}

/** iOS17AppleMusic input - no backdrop props */
interface AlertInputiOS17 extends AlertInputBase {
  alertStyle: "iOS17AppleMusic";
}

/** Discriminated union for alert input */
export type AlertInput = AlertInputiOS16 | AlertInputiOS17;

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
