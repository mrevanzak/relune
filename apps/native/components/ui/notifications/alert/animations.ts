import { Easing, withTiming } from "react-native-reanimated";
import type { AlertStyle } from "../types";

export const ALERT_ANIMATION_DURATION = 200;

/**
 * AlertKit animation parameters:
 * - presentDismissDuration: 0.2 seconds
 * - presentDismissScale: 0.8
 */
const ALERTKIT_DURATION = 200;
const ALERTKIT_SCALE = 0.8;

/**
 * Get alert entering animation based on style
 *
 * AlertKit uses simple timing animation (not spring) for both styles:
 * - Scale from 0.8 to 1.0
 * - Fade from 0 to 1
 * - Duration: 0.2 seconds
 */
export function getAlertEntering(_style: AlertStyle = "iOS16AppleMusic") {
  "worklet";

  return {
    initialValues: {
      opacity: 0,
      transform: [{ scale: ALERTKIT_SCALE }],
    },
    animations: {
      opacity: withTiming(1, { duration: ALERTKIT_DURATION }),
      transform: [
        {
          scale: withTiming(1, {
            duration: ALERTKIT_DURATION,
            easing: Easing.out(Easing.ease),
          }),
        },
      ],
    },
  };
}

/**
 * Get alert exiting animation based on style
 *
 * AlertKit uses:
 * - Scale from 1.0 to 0.8
 * - Fade from 1 to 0
 * - Duration: 0.2 seconds
 */
export function getAlertExiting(_style: AlertStyle = "iOS16AppleMusic") {
  "worklet";

  return {
    initialValues: {
      opacity: 1,
      transform: [{ scale: 1 }],
    },
    animations: {
      opacity: withTiming(0, {
        duration: ALERTKIT_DURATION,
        easing: Easing.out(Easing.ease),
      }),
      transform: [
        {
          scale: withTiming(ALERTKIT_SCALE, {
            duration: ALERTKIT_DURATION,
            easing: Easing.out(Easing.ease),
          }),
        },
      ],
    },
  };
}

/**
 * Get backdrop fade animation (iOS16 style only)
 */
export function getBackdropEntering() {
  "worklet";

  return {
    initialValues: {
      opacity: 0,
    },
    animations: {
      opacity: withTiming(1, { duration: ALERTKIT_DURATION }),
    },
  };
}

export function getBackdropExiting() {
  "worklet";

  return {
    initialValues: {
      opacity: 1,
    },
    animations: {
      opacity: withTiming(0, { duration: ALERTKIT_DURATION }),
    },
  };
}
