import { SymbolView } from "expo-symbols";
import { ActivityIndicator, View } from "react-native";
import type { IconProps } from "../types";

/**
 * Checkmark icon for success/done states (iOS - SF Symbols)
 */
export function DoneIcon({ size = 24, color }: IconProps) {
  return (
    <SymbolView
      name="checkmark.circle.fill"
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
      tintColor={color}
      weight="medium"
    />
  );
}

/**
 * X mark icon for error states (iOS - SF Symbols)
 */
export function ErrorIcon({ size = 24, color }: IconProps) {
  return (
    <SymbolView
      name="xmark.circle.fill"
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
      tintColor={color}
      weight="medium"
    />
  );
}

/**
 * Heart icon for favorites/likes (iOS - SF Symbols)
 */
export function HeartIcon({ size = 24, color }: IconProps) {
  return (
    <SymbolView
      name="heart.fill"
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
      tintColor={color}
      weight="medium"
    />
  );
}

/**
 * Loading spinner
 */
export function SpinnerIcon({ size = 24, color }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator color={color} size={size > 30 ? "large" : "small"} />
    </View>
  );
}
