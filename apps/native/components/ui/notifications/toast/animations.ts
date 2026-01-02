import { Easing, withSpring, withTiming } from "react-native-reanimated";
import type { ToastPosition } from "../types";

export const TOAST_ANIMATION_DURATION = 300;

// Custom easing functions
const easeOutCirc = Easing.bezier(0, 0.55, 0.45, 1);
const easeInOutCubic = Easing.bezier(0.65, 0, 0.35, 1);

// Spring config for bouncy feel
const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

/**
 * Get toast entering animation based on position
 */
export function getToastEntering(position: ToastPosition) {
  "worklet";

  const translateY = position === "top" ? -50 : 50;

  return {
    initialValues: {
      opacity: 0,
      transform: [{ scale: 0.9 }, { translateY }],
    },
    animations: {
      opacity: withTiming(1, { duration: 200, easing: easeOutCirc }),
      transform: [
        { scale: withSpring(1, springConfig) },
        { translateY: withSpring(0, springConfig) },
      ],
    },
  };
}

/**
 * Get toast exiting animation based on position
 */
export function getToastExiting(position: ToastPosition) {
  "worklet";

  const translateY = position === "top" ? -100 : 100;

  return {
    initialValues: {
      opacity: 1,
      transform: [{ translateY: 0 }],
    },
    animations: {
      opacity: withTiming(0, { duration: 150, easing: easeInOutCubic }),
      transform: [
        {
          translateY: withTiming(translateY, {
            duration: 200,
            easing: easeInOutCubic,
          }),
        },
      ],
    },
  };
}

/**
 * Apply progressive elastic resistance for wrong-direction drags (Apple-style)
 * Provides diminishing returns as drag distance increases
 */
export function elasticResistance(distance: number): number {
  "worklet";
  const baseResistance = 0.4;
  const progressiveFactor = 1 / (1 + Math.abs(distance) * 0.02);
  return distance * baseResistance * progressiveFactor;
}

/**
 * Threshold in pixels to trigger dismiss on drag
 */
export const DISMISS_THRESHOLD = 40;
