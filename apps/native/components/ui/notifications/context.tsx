import { createContext, useContext } from "react";
import type { AlertInput, NotificationContextValue, ToastInput } from "./types";

/**
 * Context for notification state and methods
 */
export const NotificationContext =
  createContext<NotificationContextValue | null>(null);

/**
 * Hook to access notification context
 */
export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider. " +
        "Make sure to wrap your app with <NotificationProvider>."
    );
  }
  return context;
}

// ============ SINGLETON REFS ============
// These allow imperative API access from outside React components

interface ToastRef {
  addToast: (config: ToastInput) => string;
  dismissToast: (id?: string) => void;
}

interface AlertRef {
  addAlert: (config: AlertInput) => string;
  dismissAlert: (id?: string) => void;
}

let toastRef: ToastRef | null = null;
let alertRef: AlertRef | null = null;

/**
 * Set the toast singleton ref (called by Provider)
 */
export function setToastRef(ref: ToastRef | null): void {
  toastRef = ref;
}

/**
 * Set the alert singleton ref (called by Provider)
 */
export function setAlertRef(ref: AlertRef | null): void {
  alertRef = ref;
}

/**
 * Get the toast singleton ref for imperative API
 */
export function getToastRef(): ToastRef {
  if (!toastRef) {
    throw new Error(
      "Toast is not initialized. Make sure NotificationProvider is mounted."
    );
  }
  return toastRef;
}

/**
 * Get the alert singleton ref for imperative API
 */
export function getAlertRef(): AlertRef {
  if (!alertRef) {
    throw new Error(
      "Alert is not initialized. Make sure NotificationProvider is mounted."
    );
  }
  return alertRef;
}
