import { BlurView } from "expo-blur";
import { StyleSheet, Text, View } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useIconColor } from "../hooks/useIconColor";
import { DoneIcon, ErrorIcon, HeartIcon, SpinnerIcon } from "../icons";
import { AlertKitColors } from "../theme";
import type { AlertConfig } from "../types";

interface AlertiOS16Props {
  config: AlertConfig;
}

/**
 * iOS16 Apple Music style alert - AlertKit iOS16AppleMusic
 *
 * Visual specs (matching AlertKit upstream):
 * - Vertical centered layout (icon on top, text below)
 * - Large icons (done: 112px, error: 86px, heart: 112x77px)
 * - Center-aligned text
 * - BlurView background (systemThickMaterial equivalent)
 * - Corner radius: 8
 * - Fixed width: 250px
 * - Colorful icons by default
 */
export function AlertiOS16({ config }: AlertiOS16Props) {
  const { title, message, preset, icon, coloredIcons = true } = config;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // AlertKit content color for text
  const contentColor = isDark
    ? AlertKitColors.dark.content
    : AlertKitColors.light.content;

  // Icon color (colorful by default for iOS16)
  const iconColor = useIconColor(preset, coloredIcons);

  // Get icon size based on preset (matching AlertKit layout)
  const getIconSize = () => {
    switch (preset) {
      case "done":
        return { width: 112, height: 112 };
      case "error":
        return { width: 86, height: 86 };
      case "heart":
        return { width: 112, height: 77 };
      case "spinner":
        return { width: 40, height: 40 };
      default:
        return { width: 100, height: 100 };
    }
  };

  const iconSize = getIconSize();

  // Render the appropriate icon (large for iOS16 style)
  const renderIcon = () => {
    // Custom icon takes priority
    if (icon) {
      return <View style={styles.iconContainer}>{icon}</View>;
    }

    const size = Math.min(iconSize.width, iconSize.height);

    switch (preset) {
      case "done":
        return (
          <View style={styles.iconContainer}>
            <DoneIcon color={iconColor} size={size} />
          </View>
        );
      case "error":
        return (
          <View style={styles.iconContainer}>
            <ErrorIcon color={iconColor} size={size} />
          </View>
        );
      case "heart":
        return (
          <View style={styles.iconContainer}>
            <HeartIcon color={iconColor} size={size} />
          </View>
        );
      case "spinner":
        return (
          <View style={styles.iconContainer}>
            <SpinnerIcon color={iconColor} size={size} />
          </View>
        );
      default:
        return null;
    }
  };

  const hasMessage = Boolean(message);
  const hasIcon = Boolean(icon || preset);

  return (
    <View style={[styles.shadowWrapper, config.style]}>
      <BlurView
        intensity={80}
        style={styles.blurContainer}
        tint="systemThickMaterial"
      >
        <View style={styles.content}>
          {hasIcon && renderIcon()}
          <Text
            numberOfLines={2}
            style={[styles.title, { color: contentColor }, config.titleStyle]}
          >
            {title}
          </Text>
          {hasMessage && (
            <Text
              numberOfLines={3}
              style={[
                styles.message,
                { color: contentColor },
                config.messageStyle,
              ]}
            >
              {message}
            </Text>
          )}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  blurContainer: {
    width: 250, // Fixed width matching AlertKit
    borderRadius: 8, // AlertKit iOS16 uses 8
    overflow: "hidden",
  },
  content: {
    alignItems: "center",
    // Padding matching AlertKit layout
    paddingTop: 43,
    paddingBottom: 25,
    paddingHorizontal: 16,
  },
  iconContainer: {
    marginBottom: 35, // Space between icon and title (AlertKit: spaceBetweenIconAndTitle)
  },
  title: {
    fontSize: 22, // UIFont.preferredFont(forTextStyle: .title2)
    fontWeight: "700", // bold
    textAlign: "center",
    lineHeight: 28,
  },
  message: {
    fontSize: 17, // UIFont.preferredFont(forTextStyle: .body)
    textAlign: "center",
    marginTop: 4,
    lineHeight: 22,
  },
});
