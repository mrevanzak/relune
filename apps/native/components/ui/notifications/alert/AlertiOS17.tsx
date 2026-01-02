import { BlurView } from "expo-blur";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useIconColor } from "../hooks/useIconColor";
import { DoneIcon, ErrorIcon, HeartIcon, SpinnerIcon } from "../icons";
import { AlertKitColors } from "../theme";
import type { AlertConfig } from "../types";

interface AlertiOS17Props {
  config: AlertConfig;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAX_WIDTH = Math.min(270, SCREEN_WIDTH * 0.8);

/**
 * iOS17 Apple Music style alert - AlertKit iOS17AppleMusic
 *
 * Visual specs (matching AlertKit upstream):
 * - Horizontal layout (icon left, text right)
 * - Small icon (20px)
 * - Left-aligned text
 * - BlurView background (systemMaterial equivalent)
 * - Corner radius: 14
 * - Auto width (max 270px or 80% screen width)
 * - Gray icons by default (AlertKit content color)
 * - Positioned at bottom of screen (handled by AlertContainer)
 */
export function AlertiOS17({ config }: AlertiOS17Props) {
  const { title, message, preset, icon, coloredIcons = false } = config;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // AlertKit content color for text
  const contentColor = isDark
    ? AlertKitColors.dark.content
    : AlertKitColors.light.content;

  // Icon color (gray by default for iOS17, matching AlertKit)
  const iconColor = useIconColor(preset, coloredIcons);

  // Icon size is 20px for iOS17 style
  const ICON_SIZE = 20;

  // Render the appropriate icon (small for iOS17 style)
  const renderIcon = () => {
    // Custom icon takes priority
    if (icon) {
      return <View style={styles.iconContainer}>{icon}</View>;
    }

    switch (preset) {
      case "done":
        return (
          <View style={styles.iconContainer}>
            <DoneIcon color={iconColor} size={ICON_SIZE} />
          </View>
        );
      case "error":
        return (
          <View style={styles.iconContainer}>
            <ErrorIcon color={iconColor} size={ICON_SIZE} />
          </View>
        );
      case "heart":
        return (
          <View style={styles.iconContainer}>
            <HeartIcon color={iconColor} size={ICON_SIZE} />
          </View>
        );
      case "spinner":
        return (
          <View style={styles.iconContainer}>
            <SpinnerIcon color={iconColor} size={ICON_SIZE} />
          </View>
        );
      default:
        return null;
    }
  };

  const hasMessage = Boolean(message);
  const hasIcon = Boolean(icon || preset);

  // Adjust padding based on whether there's an icon
  const containerPadding = hasIcon
    ? styles.contentWithIcon
    : styles.contentNoIcon;

  return (
    <View style={[styles.shadowWrapper, config.style]}>
      <BlurView
        intensity={80}
        style={styles.blurContainer}
        tint={isDark ? "dark" : "light"}
      >
        <View style={[styles.content, containerPadding]}>
          {hasIcon && renderIcon()}
          <View style={styles.textContainer}>
            <Text
              numberOfLines={0}
              style={[styles.title, { color: contentColor }, config.titleStyle]}
            >
              {title}
            </Text>
            {hasMessage && (
              <Text
                numberOfLines={0}
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
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    maxWidth: MAX_WIDTH,
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  blurContainer: {
    borderRadius: 14, // AlertKit iOS17 uses 14
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  contentWithIcon: {
    // AlertKit: layoutMargins with subtitle nil = (top: 17, left: 15, bottom: 17, right: 15 + 3)
    paddingVertical: 17,
    paddingLeft: 15,
    paddingRight: 18,
  },
  contentNoIcon: {
    paddingVertical: 17,
    paddingHorizontal: 15,
  },
  iconContainer: {
    marginRight: 12, // spaceBetweenLabelAndIcon from AlertKit
    marginTop: 2, // Align with first line of text
  },
  textContainer: {},
  title: {
    fontSize: 15, // UIFont.preferredFont(forTextStyle: .body, weight: .semibold, addPoints: -2)
    fontWeight: "600",
    textAlign: "left",
    lineHeight: 20,
  },
  message: {
    fontSize: 13, // UIFont.preferredFont(forTextStyle: .footnote)
    textAlign: "left",
    marginTop: 4, // spaceBetweenTitleAndSubtitle from AlertKit
    lineHeight: 18,
  },
});
