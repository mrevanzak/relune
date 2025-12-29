import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import { Gradients, GradientsDark } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface GradientBackgroundProps {
  children: ReactNode;
  style?: ViewStyle;
  /** Use a custom gradient or default to background gradient */
  colors?: readonly [string, string, ...string[]];
}

/**
 * A full-screen gradient background wrapper.
 * Provides consistent brand gradient across all screens.
 */
export function GradientBackground({
  children,
  style,
  colors,
}: GradientBackgroundProps) {
  const colorScheme = useColorScheme();
  const defaultColors =
    colorScheme === "dark" ? GradientsDark.background : Gradients.background;

  return (
    <LinearGradient
      colors={colors ?? defaultColors}
      end={{ x: 0.5, y: 1 }}
      start={{ x: 0.5, y: 0 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
