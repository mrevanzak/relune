import { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Shadows, ShadowsDark } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

const SEGMENT_PADDING = 3;
const SEGMENT_HEIGHT = 40;

export function SegmentedControl({
  segments,
  selectedIndex,
  onChange,
}: SegmentedControlProps) {
  const surface = useThemeColor({}, "surface");
  const surfaceHighlight = useThemeColor({}, "surfaceHighlight");
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const colorScheme = useColorScheme();

  const shadowStyle =
    colorScheme === "dark" ? ShadowsDark.small : Shadows.small;

  // Animated position for the sliding indicator
  const translateX = useSharedValue(0);
  const containerWidth = useSharedValue(0);

  const segmentWidth =
    containerWidth.value > 0
      ? (containerWidth.value - SEGMENT_PADDING * 2) / segments.length
      : 0;

  // Update position when selectedIndex changes
  useEffect(() => {
    if (containerWidth.value > 0) {
      const newPosition = SEGMENT_PADDING + selectedIndex * segmentWidth;
      translateX.value = withSpring(newPosition, {
        damping: 20,
        stiffness: 200,
      });
    }
  }, [selectedIndex, segmentWidth, translateX, containerWidth]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: segmentWidth,
  }));

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      const { width } = event.nativeEvent.layout;
      containerWidth.value = width;
      // Set initial position after layout
      const newSegmentWidth = (width - SEGMENT_PADDING * 2) / segments.length;
      translateX.value = SEGMENT_PADDING + selectedIndex * newSegmentWidth;
    },
    [segments.length, selectedIndex, containerWidth, translateX]
  );

  return (
    <View
      onLayout={handleLayout}
      style={[styles.container, { backgroundColor: surfaceHighlight }]}
    >
      {/* Animated sliding indicator */}
      <Animated.View
        style={[
          styles.indicator,
          animatedIndicatorStyle,
          { backgroundColor: surface },
          shadowStyle,
        ]}
      />

      {/* Segment buttons */}
      {segments.map((segment, index) => {
        const isSelected = index === selectedIndex;

        return (
          <Pressable
            key={segment}
            onPress={() => onChange(index)}
            style={styles.segment}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected
                  ? [styles.selectedText, { color: text }]
                  : { color: textSecondary },
              ]}
            >
              {segment}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 16,
    padding: SEGMENT_PADDING,
    position: "relative",
    height: SEGMENT_HEIGHT + SEGMENT_PADDING * 2,
  },
  indicator: {
    position: "absolute",
    top: SEGMENT_PADDING,
    bottom: SEGMENT_PADDING,
    borderRadius: 14,
  },
  segment: {
    flex: 1,
    height: SEGMENT_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectedText: {
    fontWeight: "600",
  },
});
