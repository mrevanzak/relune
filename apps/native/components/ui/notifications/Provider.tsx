import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, StyleSheet, View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";
import { AlertContainer } from "./alert/AlertContainer";
import { NotificationContext, setAlertRef, setToastRef } from "./context";
import { ToastContainer } from "./toast/ToastContainer";
import type {
  AlertConfig,
  AlertInput,
  NotificationContextValue,
  ToastConfig,
  ToastInput,
} from "./types";

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * Provider component that manages toast and alert state
 * Must wrap the app root to enable notifications
 */
export function NotificationProvider({ children }: NotificationProviderProps) {
  // Toast state - only show latest (replace behavior)
  const [currentToast, setCurrentToast] = useState<ToastConfig | null>(null);

  // Alert state - queue (show one at a time, queue others)
  const [alertQueue, setAlertQueue] = useState<AlertConfig[]>([]);
  const currentAlert = alertQueue[0] ?? null;

  // Counters for generating IDs
  const toastCounter = useRef(1);
  const alertCounter = useRef(1);

  // ============ TOAST METHODS ============

  const addToast = useCallback((input: ToastInput): string => {
    const id = input.id ?? `toast-${toastCounter.current++}`;
    const config: ToastConfig = {
      ...input,
      id,
      preset: input.preset ?? "custom",
      position: input.position ?? "top",
      duration: input.duration ?? 2000,
      dismissible: input.dismissible ?? true,
    };

    // Dismiss any spinner alerts when adding a new toast
    setAlertQueue((queue) => {
      const spinnerAlerts = queue.filter((a) => a.preset === "spinner");
      for (const spinnerAlert of spinnerAlerts) {
        spinnerAlert.onDismiss?.();
      }
      return queue.filter((a) => a.preset !== "spinner");
    });

    // Replace current toast, calling onDismiss if it was a spinner
    setCurrentToast((current) => {
      if (current?.preset === "spinner") {
        current.onDismiss?.();
      }
      return config;
    });

    return id;
  }, []);

  const dismissToast = useCallback((id?: string) => {
    setCurrentToast((current) => {
      if (!current) return null;
      if (id && current.id !== id) return current;
      return null;
    });
  }, []);

  // ============ ALERT METHODS ============

  const addAlert = useCallback((input: AlertInput): string => {
    const id = input.id ?? `alert-${alertCounter.current++}`;
    const config: AlertConfig = {
      ...input,
      id,
      preset: input.preset ?? "custom",
      duration: input.duration ?? 2500,
    };

    // Dismiss any spinner toast when adding a new alert
    setCurrentToast((current) => {
      if (current?.preset === "spinner") {
        current.onDismiss?.();
        return null;
      }
      return current;
    });

    // Filter out any spinner alerts from queue, calling their onDismiss callbacks
    setAlertQueue((queue) => {
      const spinnerAlerts = queue.filter((a) => a.preset === "spinner");
      for (const spinnerAlert of spinnerAlerts) {
        spinnerAlert.onDismiss?.();
      }
      return [...queue.filter((a) => a.preset !== "spinner"), config];
    });

    return id;
  }, []);

  const dismissAlert = useCallback((id?: string) => {
    setAlertQueue((queue) => {
      if (queue.length === 0) return queue;

      if (id) {
        // Dismiss specific alert
        return queue.filter((a) => a.id !== id);
      }

      // Dismiss first (current) alert
      return queue.slice(1);
    });
  }, []);

  // ============ CONTEXT VALUE ============

  const contextValue = useMemo<NotificationContextValue>(
    () => ({
      addToast,
      dismissToast,
      addAlert,
      dismissAlert,
    }),
    [addToast, dismissToast, addAlert, dismissAlert]
  );

  // Set singleton refs for imperative API
  useEffect(() => {
    setToastRef({ addToast, dismissToast });
    setAlertRef({ addAlert, dismissAlert });

    return () => {
      setToastRef(null);
      setAlertRef(null);
    };
  }, [addToast, dismissToast, addAlert, dismissAlert]);

  // ============ HANDLE DISMISS CALLBACKS ============

  const handleToastDismiss = useCallback(
    (id: string) => {
      dismissToast(id);
    },
    [dismissToast]
  );

  const handleAlertDismiss = useCallback(
    (id: string) => {
      dismissAlert(id);
    },
    [dismissAlert]
  );

  // ============ RENDER ============

  // Notification overlay content
  const notificationContent = (
    <View pointerEvents="box-none" style={styles.overlay}>
      {/* Toast - only one at a time */}
      {currentToast && (
        <ToastContainer
          key={currentToast.id}
          onDismiss={handleToastDismiss}
          toast={currentToast}
        />
      )}

      {/* Alert - only show first in queue */}
      {currentAlert && (
        <AlertContainer
          alert={currentAlert}
          key={currentAlert.id}
          onDismiss={handleAlertDismiss}
        />
      )}
    </View>
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      {/* 
        On iOS, use FullWindowOverlay to render above everything (modals, sheets, etc.)
        On Android, just render in the normal tree
      */}
      {Platform.OS === "ios" ? (
        <FullWindowOverlay>{notificationContent}</FullWindowOverlay>
      ) : (
        notificationContent
      )}
    </NotificationContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "box-none",
  },
});
