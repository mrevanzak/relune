import type { UseMutationResult } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import * as FileSystem from "expo-file-system";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  type EntryAnimationsValues,
  type ExitAnimationsValues,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { UploadRecordingParams } from "@/features/upload";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { formatDurationMs } from "@/lib/date";
import { recordingUIStore } from "@/stores/recording-ui";

// Layout constants
const TAB_BAR_HEIGHT = 49; // Standard iOS native tab bar height
const ACCESSORY_MARGIN = 16;
const ACCESSORY_MARGIN_BOTTOM = 8;

// Custom entering animation: slide up + fade in
const enteringAnimation = (values: EntryAnimationsValues) => {
  "worklet";
  return {
    initialValues: {
      opacity: 0,
      transform: [{ translateY: values.targetHeight + 50 }],
    },
    animations: {
      opacity: withTiming(1, { duration: 200 }),
      transform: [{ translateY: withTiming(0, { duration: 200 }) }],
    },
  };
};

// Custom exiting animation: slide down + fade out
const exitingAnimation = (_values: ExitAnimationsValues) => {
  "worklet";
  return {
    initialValues: {
      opacity: 1,
      transform: [{ translateY: 0 }],
    },
    animations: {
      opacity: withTiming(0, { duration: 150 }),
      transform: [{ translateY: withTiming(100, { duration: 200 }) }],
    },
  };
};

/**
 * Pulsing red dot indicator for recording state
 */
function RecordingDot() {
  const error = useThemeColor({}, "error");
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.recordingDot, { backgroundColor: error }, animatedStyle]}
    />
  );
}

/**
 * Recording indicator with duration and discard button
 */
function RecordingIndicator({
  durationMs,
  onDiscard,
}: {
  durationMs: number;
  onDiscard: () => void;
}) {
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={styles.content}>
      <RecordingDot />
      <Text style={[styles.statusText, { color: text }]}>Recording</Text>
      <Text style={[styles.duration, { color: textSecondary }]}>
        {formatDurationMs(durationMs)}
      </Text>
      <TouchableOpacity onPress={onDiscard} style={styles.actionButton}>
        <Text style={[styles.discardText, { color: textSecondary }]}>
          Discard
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Uploading spinner with duration display
 */
function UploadingIndicator({ durationSeconds }: { durationSeconds: number }) {
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={styles.content}>
      <ActivityIndicator color={textSecondary} size="small" />
      <Text style={[styles.statusText, { color: text }]}>Saving...</Text>
      <Text style={[styles.duration, { color: textSecondary }]}>
        {formatDurationMs(durationSeconds * 1000)}
      </Text>
    </View>
  );
}

/**
 * Success checkmark indicator (auto-dismisses)
 */
function SuccessIndicator() {
  const success = useThemeColor({}, "success");

  return (
    <View style={styles.content}>
      <Text style={[styles.successIcon, { color: success }]}>✓</Text>
      <Text style={[styles.successText, { color: success }]}>Saved</Text>
    </View>
  );
}

/**
 * Error indicator with retry and discard options
 */
function ErrorIndicator({
  message,
  onRetry,
  onDiscard,
}: {
  message: string;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const error = useThemeColor({}, "error");
  const textSecondary = useThemeColor({}, "textSecondary");
  const primaryPurple = useThemeColor({}, "tint"); // Using tint as primaryPurple

  return (
    <View style={styles.content}>
      <Text style={[styles.errorIcon, { color: error }]}>✗</Text>
      <Text numberOfLines={1} style={[styles.errorText, { color: error }]}>
        {message || "Failed to save"}
      </Text>
      <TouchableOpacity onPress={onDiscard} style={styles.actionButton}>
        <Text style={[styles.discardText, { color: textSecondary }]}>
          Discard
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onRetry}
        style={[styles.retryButton, { backgroundColor: primaryPurple }]}
      >
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

type AccessoryStatus = "recording" | "uploading" | "success" | "error";

interface RecordingAccessoryViewProps {
  /**
   * Recording phase state (from recording-ui store)
   */
  isRecording: boolean;
  durationMs: number;
  onDiscardRecording: () => void;

  /**
   * Upload phase state (from TanStack Query mutation)
   */
  mutation: UseMutationResult<unknown, Error, UploadRecordingParams>;
}

/**
 * Floating accessory view that displays recording session status.
 * Positioned above the tab bar with glass/blur background effect.
 *
 * State is derived from:
 * - Recording phase: isRecording + durationMs props (from recording-ui store)
 * - Upload phase: mutation state (isPending, isSuccess, isError)
 */
export function RecordingAccessoryView({
  isRecording,
  durationMs,
  onDiscardRecording,
  mutation,
}: RecordingAccessoryViewProps) {
  const insets = useSafeAreaInsets();
  const useLiquidGlass = isLiquidGlassAvailable();
  const resetUI = recordingUIStore.use.reset();
  const colorScheme = useColorScheme();

  // Derive status from props
  const status: AccessoryStatus | null = useMemo(() => {
    if (isRecording) return "recording";
    if (mutation.isPending) return "uploading";
    if (mutation.isSuccess) return "success";
    if (mutation.isError) return "error";
    return null;
  }, [isRecording, mutation.isPending, mutation.isSuccess, mutation.isError]);

  // Auto-dismiss success after 2 seconds
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        mutation.reset();
        resetUI();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, mutation, resetUI]);

  // Haptic feedback on state changes
  useEffect(() => {
    const triggerHaptic = async (type: AccessoryStatus) => {
      switch (type) {
        case "recording":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "uploading":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "success":
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
          break;
        case "error":
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error
          );
          break;
        default:
          break;
      }
    };

    if (status) {
      triggerHaptic(status);
    }
  }, [status]);

  const handleDiscardRecording = () => {
    Alert.alert(
      "Discard Recording",
      "Stop and discard this recording?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: onDiscardRecording,
        },
      ],
      { cancelable: true }
    );
  };

  const handleDiscardUpload = async () => {
    const uri = mutation.variables?.uri;
    if (uri) {
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch {
        // Ignore deletion errors
      }
    }
    mutation.reset();
    resetUI();
  };

  const handleDiscardError = () => {
    Alert.alert(
      "Discard Recording",
      "Discard this recording? It won't be saved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: handleDiscardUpload,
        },
      ],
      { cancelable: true }
    );
  };

  const handleRetry = () => {
    if (mutation.variables) {
      mutation.mutate(mutation.variables);
    }
  };

  const renderContent = () => {
    switch (status) {
      case "recording":
        return (
          <RecordingIndicator
            durationMs={durationMs}
            onDiscard={handleDiscardRecording}
          />
        );
      case "uploading":
        return (
          <UploadingIndicator
            durationSeconds={mutation.variables?.durationSeconds ?? 0}
          />
        );
      case "success":
        return <SuccessIndicator />;
      case "error":
        return (
          <ErrorIndicator
            message={mutation.error?.message ?? "Failed to save"}
            onDiscard={handleDiscardError}
            onRetry={handleRetry}
          />
        );
      default:
        return null;
    }
  };

  // Calculate bottom position above tab bar
  const bottomPosition =
    TAB_BAR_HEIGHT + insets.bottom + ACCESSORY_MARGIN_BOTTOM;

  return (
    <Animated.View
      entering={enteringAnimation}
      exiting={exitingAnimation}
      style={[styles.container, { bottom: bottomPosition }]}
    >
      {/* Glass/Blur background */}
      {useLiquidGlass ? (
        <GlassView style={StyleSheet.absoluteFill} />
      ) : (
        <BlurView
          intensity={80}
          style={StyleSheet.absoluteFill}
          tint={colorScheme === "dark" ? "dark" : "light"}
        />
      )}

      {/* Content */}
      {renderContent()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: ACCESSORY_MARGIN,
    right: ACCESSORY_MARGIN,
    borderRadius: 1000,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    flex: 1,
  },
  duration: {
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  discardText: {
    fontSize: 14,
  },
  retryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  successIcon: {
    fontSize: 16,
    fontWeight: "bold",
  },
  successText: {
    fontSize: 14,
  },
  errorIcon: {
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
});
