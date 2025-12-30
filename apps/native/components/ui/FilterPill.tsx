import { LinearGradient } from "expo-linear-gradient";
import { PressableScale } from "pressto";
import { StyleSheet, Text } from "react-native";
import {
  Gradients,
  GradientsDark,
  Shadows,
  ShadowsDark,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";

interface FilterPillProps {
  label: string;
  isActive?: boolean;
  onPress?: () => void;
}

export function FilterPill({
  label,
  isActive = false,
  onPress,
}: FilterPillProps) {
  const surface = useThemeColor({}, "surface");
  const textSecondary = useThemeColor({}, "textSecondary");
  const colorScheme = useColorScheme();
  const primaryGradient =
    colorScheme === "dark" ? GradientsDark.primary : Gradients.primary;

  const shadowStyle =
    colorScheme === "dark" ? ShadowsDark.small : Shadows.small;

  if (isActive) {
    return (
      <PressableScale onPress={onPress} style={[styles.container, shadowStyle]}>
        <LinearGradient
          colors={primaryGradient}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.gradientContainer}
        >
          <Text style={[styles.activeText, { color: surface }]}>{label}</Text>
        </LinearGradient>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.container,
        shadowStyle,
        styles.inactiveContainer,
        { backgroundColor: surface },
      ]}
    >
      <Text style={[styles.inactiveText, { color: textSecondary }]}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  gradientContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: "hidden",
  },
  inactiveContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: "hidden",
  },
  activeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  inactiveText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
