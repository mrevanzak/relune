import { LinearGradient } from "expo-linear-gradient";
import { PressableScale } from "pressto";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Gradients, GradientsDark, Shadows, ShadowsDark } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";

interface SoftButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  style?: ViewStyle;
}

/**
 * A soft, gradient-styled button with brand aesthetics.
 * Primary: Purple gradient with white text
 * Secondary: White background with purple text
 * Ghost: Transparent with purple text
 */
export function SoftButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  style,
}: SoftButtonProps) {
  const surface = useThemeColor({}, "surface");
  const tint = useThemeColor({}, "tint");
  const lilac = useThemeColor({}, "lilac");
  const colorScheme = useColorScheme();
  const primaryGradient =
    colorScheme === "dark" ? GradientsDark.primary : Gradients.primary;
  
  const shadowStyle = colorScheme === "dark" ? ShadowsDark.small : Shadows.small;

  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (!isDisabled && onPress) {
      onPress();
    }
  };

  if (variant === "primary") {
    return (
      <PressableScale
        onPress={handlePress}
        style={[styles.container, shadowStyle, isDisabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={primaryGradient}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.gradient}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={[styles.primaryText, { color: surface }]}>
              {title}
            </Text>
            {loading && <ActivityIndicator color={surface} size="small" />}
          </View>
        </LinearGradient>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      onPress={handlePress}
      style={[
        styles.container,
        shadowStyle,
        variant === "secondary"
          ? [styles.secondary, { backgroundColor: surface, borderColor: lilac }]
          : styles.ghost,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tint} size="small" />
      ) : (
        <Text
          style={[
            styles.secondaryText,
            { color: tint },
            variant === "ghost" && styles.ghostText,
          ]}
        >
          {title}
        </Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    backgroundColor: "transparent", // Ensure shadow is visible
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16, // Moved borderRadius here for clipping if needed, but LinearGradient handles it usually
    overflow: "hidden", // Clip content to border radius
  },
  secondary: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  ghost: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0,
    elevation: 0,
    borderRadius: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  ghostText: {
    fontWeight: "500",
  },
});
