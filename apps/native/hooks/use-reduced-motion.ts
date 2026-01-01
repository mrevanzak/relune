import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Hook to detect if the user has enabled "Reduce Motion" in OS accessibility settings.
 * Returns true if reduced motion is enabled, false otherwise.
 *
 * Use this to disable or minimize non-essential animations.
 */
export function useReducedMotion(): boolean {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setIsReducedMotion);

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setIsReducedMotion
    );

    return () => subscription.remove();
  }, []);

  return isReducedMotion;
}
