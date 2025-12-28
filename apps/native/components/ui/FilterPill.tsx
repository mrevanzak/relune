import { LinearGradient } from "expo-linear-gradient";
import { PressableScale } from "pressto";
import { StyleSheet, Text } from "react-native";
import { Gradients, Shadows } from "@/constants/theme";
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

  if (isActive) {
    return (
      <PressableScale onPress={onPress} style={styles.container}>
        <LinearGradient
          colors={Gradients.primary}
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
    overflow: "hidden",
    ...Shadows.small,
  },
  gradientContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  inactiveContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
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
