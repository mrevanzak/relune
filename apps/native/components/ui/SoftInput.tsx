import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import { Shadows, ShadowsDark } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface SoftInputProps extends TextInputProps {
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
}

export function SoftInput({
  icon,
  style,
  containerStyle,
  ...props
}: SoftInputProps) {
  const surface = useThemeColor({}, "surface");
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const colorScheme = useColorScheme();
  
  const shadowStyle = colorScheme === "dark" ? ShadowsDark.small : Shadows.small;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: surface },
        shadowStyle,
        containerStyle,
      ]}
    >
      {icon && (
        <Ionicons
          color={textSecondary}
          name={icon}
          size={20}
          style={[styles.icon, props.multiline && styles.iconMultiline]}
        />
      )}
      <TextInput
        placeholderTextColor={textSecondary}
        style={[styles.input, { color: text }, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  icon: {
    marginRight: 8,
  },
  iconMultiline: {
    alignSelf: "flex-start",
    marginTop: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12, // Add padding for vertical centering/multiline
  },
});
