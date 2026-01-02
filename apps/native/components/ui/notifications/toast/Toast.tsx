import { BlurView } from "expo-blur";
import { useState } from "react";
import { StyleSheet, Text, type TextLayoutEventData, View } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useIconColor } from "../hooks/useIconColor";
import { DoneIcon, ErrorIcon, SpinnerIcon } from "../icons";
import { SPIndicatorLabelColors } from "../theme";
import type { ToastConfig } from "../types";

interface ToastProps {
  config: ToastConfig;
}

/**
 * Toast UI component - SPIndicator-style floating pill
 * Uses BlurView for native iOS feel
 *
 * Text colors match SPIndicator:
 * - Title: UIColor.label.withAlphaComponent(0.6)
 * - Subtitle: UIColor.label.withAlphaComponent(0.3)
 */
export function Toast({ config }: ToastProps) {
  const { title, message, preset, icon, coloredIcons = true } = config;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [isMultiline, setIsMultiline] = useState(false);

  // SPIndicator colors (label with opacity)
  const labelColors = isDark
    ? SPIndicatorLabelColors.dark
    : SPIndicatorLabelColors.light;
  const titleColor = labelColors.title;
  const subtitleColor = labelColors.subtitle;

  // Icon color (colorful by default for toast)
  const iconColor = useIconColor(preset, coloredIcons);

  // Render the appropriate icon
  const renderIcon = () => {
    // Custom icon takes priority
    if (icon) {
      return <View style={styles.iconContainer}>{icon}</View>;
    }

    const iconSize = 22;

    switch (preset) {
      case "done":
        return (
          <View style={styles.iconContainer}>
            <DoneIcon color={iconColor} size={iconSize} />
          </View>
        );
      case "error":
        return (
          <View style={styles.iconContainer}>
            <ErrorIcon color={iconColor} size={iconSize} />
          </View>
        );
      case "spinner":
        return (
          <View style={styles.iconContainer}>
            <SpinnerIcon color={iconColor} size={iconSize} />
          </View>
        );
      default:
        return null;
    }
  };

  // Handle text layout to detect multiline
  const handleTextLayout = (event: { nativeEvent: TextLayoutEventData }) => {
    if (event.nativeEvent.lines.length > 1) {
      setIsMultiline(true);
    }
  };

  const hasMessage = Boolean(message);
  const hasIcon = Boolean(icon || preset);

  return (
    <View
      style={[
        styles.shadowWrapper,
        isMultiline && styles.shadowWrapperMultiline,
        config.style,
      ]}
    >
      <BlurView
        intensity={80}
        style={[
          styles.blurContainer,
          isMultiline && styles.blurContainerMultiline,
        ]}
        tint={isDark ? "dark" : "light"}
      >
        <View
          style={[
            styles.content,
            hasIcon && styles.contentWithIcon,
            isMultiline && styles.contentMultiline,
          ]}
        >
          {renderIcon()}
          <View style={styles.textContainer}>
            <Text
              numberOfLines={1}
              style={[styles.title, { color: titleColor }, config.titleStyle]}
            >
              {title}
            </Text>
            {hasMessage && (
              <Text
                numberOfLines={3}
                onTextLayout={handleTextLayout}
                style={[
                  styles.message,
                  { color: subtitleColor },
                  config.messageStyle,
                ]}
              >
                {message}
              </Text>
            )}
          </View>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Outer wrapper for shadow (no overflow:hidden so shadow is visible)
  shadowWrapper: {
    borderRadius: 1000, // Pill shape
    maxWidth: "90%",
    // Shadow (SPIndicator values)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 40,
    elevation: 8,
  },
  shadowWrapperMultiline: {
    borderRadius: 16, // Rounded rect for multiline
  },
  // Inner BlurView with overflow:hidden to clip content
  blurContainer: {
    borderRadius: 1000,
    overflow: "hidden",
  },
  blurContainerMultiline: {
    borderRadius: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  contentWithIcon: {
    paddingLeft: 14,
  },
  contentMultiline: {
    alignItems: "flex-start", // Top-align icon when multiline
  },
  iconContainer: {
    flexShrink: 0,
  },
  textContainer: {
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  message: {
    fontSize: 14,
  },
});
