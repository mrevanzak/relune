import { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { getToastHaptic, triggerHaptic } from "../haptics";
import type { ToastConfig, ToastPosition } from "../types";
import {
  DISMISS_THRESHOLD,
  elasticResistance,
  getToastEntering,
  getToastExiting,
} from "./animations";
import { Toast } from "./Toast";

interface ToastContainerProps {
  toast: ToastConfig;
  onDismiss: (id: string) => void;
}

/**
 * Container for a single toast with positioning, animations, and gestures
 */
export function ToastContainer({ toast, onDismiss }: ToastContainerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const isDragging = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const timerStart = useRef<number | undefined>(undefined);

  const position: ToastPosition = toast.position ?? "top";
  const duration = toast.duration ?? 2000;
  const dismissible = toast.dismissible ?? true;

  // Trigger haptic on mount
  useEffect(() => {
    const hapticType = toast.haptic ?? getToastHaptic(toast.preset);
    triggerHaptic(hapticType);
  }, [toast.haptic, toast.preset]);

  // Auto-dismiss timer
  const startTimer = useCallback(() => {
    if (duration === Number.POSITIVE_INFINITY) return;

    clearTimeout(timer.current);
    timerStart.current = Date.now();
    timer.current = setTimeout(() => {
      if (!isDragging.current) {
        toast.onDismiss?.();
        onDismiss(toast.id);
      }
    }, duration);
  }, [duration, toast, onDismiss]);

  useEffect(() => {
    startTimer();
    return () => {
      clearTimeout(timer.current);
    };
  }, [startTimer]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    clearTimeout(timer.current);
    toast.onDismiss?.();
    onDismiss(toast.id);
  }, [toast, onDismiss]);

  // Pan gesture for swipe-to-dismiss
  const panGesture = Gesture.Pan()
    .enabled(dismissible)
    .onBegin(() => {
      "worklet";
      isDragging.current = true;
    })
    .onChange((event) => {
      "worklet";
      const isTopPosition = position === "top";
      const translation = event.translationY;

      // Correct direction: up for top, down for bottom
      const isCorrectDirection = isTopPosition
        ? translation < 0
        : translation > 0;

      if (isCorrectDirection) {
        translateY.value = translation;
      } else {
        // Elastic resistance for wrong direction
        translateY.value = elasticResistance(translation);
      }
    })
    .onFinalize((event) => {
      "worklet";
      isDragging.current = false;

      const isTopPosition = position === "top";
      const translation = event.translationY;

      // Check if should dismiss
      const isCorrectDirection = isTopPosition
        ? translation < 0
        : translation > 0;
      const shouldDismiss =
        isCorrectDirection && Math.abs(translation) > DISMISS_THRESHOLD;

      if (shouldDismiss) {
        // Animate out in drag direction
        const targetY = isTopPosition ? -200 : 200;
        translateY.value = withTiming(
          targetY,
          { duration: 150, easing: Easing.out(Easing.ease) },
          () => {
            scheduleOnRN(handleDismiss);
          }
        );
      } else {
        // Spring back to origin
        translateY.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.back(1.5)),
        });

        // Resume timer with remaining time
        if (timerStart.current && duration !== Number.POSITIVE_INFINITY) {
          const elapsed = Date.now() - timerStart.current;
          const remaining = Math.max(duration - elapsed, 500);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            scheduleOnRN(handleDismiss);
          }, remaining);
        }
      }
    });

  // Animated style for drag
  const animatedDragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Position offset
  const positionStyle =
    position === "top"
      ? { top: insets.top + 8 }
      : { bottom: insets.bottom + 8 };

  // Custom entering/exiting animations
  const entering = () => {
    "worklet";
    return getToastEntering(position);
  };

  const exiting = () => {
    "worklet";
    return getToastExiting(position);
  };

  return (
    <View pointerEvents="box-none" style={[styles.positioner, positionStyle]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          entering={entering}
          exiting={exiting}
          style={[styles.toastWrapper, animatedDragStyle]}
        >
          <Toast config={toast} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  positioner: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toastWrapper: {
    maxWidth: "100%",
  },
});
