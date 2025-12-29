import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";

interface BootstrapErrorScreenProps {
  error: Error;
  onRetry: () => void;
}

export function BootstrapErrorScreen({
  error,
  onRetry,
}: BootstrapErrorScreenProps) {
  const background = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tint = useThemeColor({}, "tint");

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <Text style={[styles.title, { color: text }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: textSecondary }]}>
        {error.message}
      </Text>
      <Pressable
        onPress={onRetry}
        style={[styles.button, { backgroundColor: tint }]}
      >
        <Text style={styles.buttonText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
