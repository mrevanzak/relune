import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import type { IconProps } from "../types";

/**
 * Checkmark icon for success/done states (Android fallback)
 */
export function DoneIcon({ size = 24, color }: IconProps) {
  const checkSize = size * 0.5;
  return (
    <View
      style={[
        styles.iconContainer,
        {
          width: size,
          height: size,
          backgroundColor: color,
        },
      ]}
    >
      <View
        style={[
          styles.checkmark,
          {
            width: checkSize * 0.4,
            height: checkSize * 0.8,
            borderColor: "#FFFFFF",
            borderRightWidth: 2,
            borderBottomWidth: 2,
          },
        ]}
      />
    </View>
  );
}

/**
 * X mark icon for error states (Android fallback)
 */
export function ErrorIcon({ size = 24, color }: IconProps) {
  const crossSize = size * 0.35;
  return (
    <View
      style={[
        styles.iconContainer,
        {
          width: size,
          height: size,
          backgroundColor: color,
        },
      ]}
    >
      <View style={styles.crossContainer}>
        <View
          style={[
            styles.crossLine,
            {
              width: crossSize,
              height: 2,
              backgroundColor: "#FFFFFF",
              transform: [{ rotate: "45deg" }],
            },
          ]}
        />
        <View
          style={[
            styles.crossLine,
            {
              width: crossSize,
              height: 2,
              backgroundColor: "#FFFFFF",
              transform: [{ rotate: "-45deg" }],
              position: "absolute",
            },
          ]}
        />
      </View>
    </View>
  );
}

/**
 * Heart icon for favorites/likes (Android fallback)
 */
export function HeartIcon({ size = 24, color }: IconProps) {
  // Simple filled circle as fallback - could be replaced with SVG
  return (
    <View
      style={[
        styles.iconContainer,
        {
          width: size,
          height: size,
          backgroundColor: color,
        },
      ]}
    >
      <View style={[styles.heartShape, { borderColor: "#FFFFFF" }]} />
    </View>
  );
}

/**
 * Loading spinner with rotation animation
 */
export function SpinnerIcon({ size = 24, color }: IconProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          justifyContent: "center",
          alignItems: "center",
        },
        animatedStyle,
      ]}
    >
      <ActivityIndicator color={color} size={size > 30 ? "large" : "small"} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    borderRadius: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    transform: [{ rotate: "45deg" }, { translateY: -1 }, { translateX: 1 }],
  },
  crossContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  crossLine: {
    borderRadius: 1,
  },
  heartShape: {
    // Simplified heart - would be better as SVG
    width: 8,
    height: 8,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
  },
});
