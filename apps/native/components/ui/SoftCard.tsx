import { StyleSheet, View, type ViewProps } from "react-native";
import { Shadows, ShadowsDark } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface SoftCardProps extends ViewProps {
  variant?: "surface" | "highlight";
}

export function SoftCard({
  style,
  variant = "surface",
  children,
  ...props
}: SoftCardProps) {
  const surface = useThemeColor({}, "surface");
  const surfaceHighlight = useThemeColor({}, "surfaceHighlight");
  const colorScheme = useColorScheme();

  const backgroundColor = variant === "surface" ? surface : surfaceHighlight;
  const shadowStyle = colorScheme === "dark" ? ShadowsDark.soft : Shadows.soft;

  return (
    <View style={[styles.card, { backgroundColor }, shadowStyle, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
  },
});
