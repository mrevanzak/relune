import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";
import { Shadows } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

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

  return (
    <View
      style={[styles.container, { backgroundColor: surface }, containerStyle]}
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
    ...Shadows.small,
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
