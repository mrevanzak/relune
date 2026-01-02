import { useCallback, useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAlertHaptic, triggerHaptic } from "../haptics";
import type { AlertConfig, AlertStyle } from "../types";
import { Alert } from "./Alert";
import {
  getAlertEntering,
  getAlertExiting,
  getBackdropEntering,
  getBackdropExiting,
} from "./animations";

interface AlertContainerProps {
  alert: AlertConfig;
  onDismiss: (id: string) => void;
}

/**
 * Container for a single alert with backdrop and tap-to-dismiss
 *
 * Styles:
 * - iOS16AppleMusic: Centered with dimmed backdrop
 * - iOS17AppleMusic: Bottom-positioned near safe area, no backdrop
 */
export function AlertContainer({ alert, onDismiss }: AlertContainerProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const insets = useSafeAreaInsets();

  const alertStyle: AlertStyle = alert.alertStyle ?? "iOS16AppleMusic";
  const isIOS17 = alertStyle === "iOS17AppleMusic";

  const duration = alert.duration ?? 2500;

  // Trigger haptic on mount
  useEffect(() => {
    const hapticType = alert.haptic ?? getAlertHaptic(alert.preset);
    triggerHaptic(hapticType);
  }, [alert.haptic, alert.preset]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    clearTimeout(timer.current);
    alert.onDismiss?.();
    onDismiss(alert.id);
  }, [alert, onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    if (duration === Number.POSITIVE_INFINITY) return;

    timer.current = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      clearTimeout(timer.current);
    };
  }, [duration, handleDismiss]);

  // Custom animations - pass style for potential style-specific animations
  const backdropEntering = () => {
    "worklet";
    return getBackdropEntering();
  };

  const backdropExiting = () => {
    "worklet";
    return getBackdropExiting();
  };

  const alertEntering = () => {
    "worklet";
    return getAlertEntering(alertStyle);
  };

  const alertExiting = () => {
    "worklet";
    return getAlertExiting(alertStyle);
  };

  // iOS17 style: bottom positioned, no backdrop
  if (isIOS17) {
    return (
      <View
        pointerEvents="box-none"
        style={[
          styles.container,
          styles.containerBottom,
          { paddingBottom: insets.bottom + 64 },
        ]}
      >
        <Pressable onPress={handleDismiss}>
          <Animated.View entering={alertEntering} exiting={alertExiting}>
            <Alert config={alert} />
          </Animated.View>
        </Pressable>
      </View>
    );
  }

  // Render backdrop - use custom if provided, otherwise default
  const renderBackdrop = () => {
    // backdropComponent only exists on iOS16 config (type narrowing)
    if ("backdropComponent" in alert && alert.backdropComponent) {
      return alert.backdropComponent();
    }

    // Default animated backdrop
    return (
      <Animated.View
        entering={backdropEntering}
        exiting={backdropExiting}
        style={styles.backdrop}
      />
    );
  };

  // iOS16 style: centered with backdrop
  return (
    <Pressable onPress={handleDismiss} style={styles.container}>
      {renderBackdrop()}

      {/* Alert card - pressable to dismiss */}
      <Animated.View
        entering={alertEntering}
        exiting={alertExiting}
        style={styles.alertWrapper}
      >
        <Alert config={alert} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  containerBottom: {
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  alertWrapper: {
    // Alert is centered by parent flexbox
  },
});
