/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const tintColorLight = "#C18ED8";
const tintColorDark = "#C18ED8";

export const ReluneColors = {
  // Brand Palette
  warmPeach: "#fbebe1",
  darkPeach: "#f5e3df",
  mistyRose: "#ecdadd",
  dustyPink: "#e2c4d7",
  lilac: "#d4aecd",
  primaryPurple: "#C18ED8",

  // Semantic
  background: "#fbebe1",
  surface: "#FFFFFF",
  surfaceHighlight: "#f5e3df",
  text: "#4A4A4A",
  textSecondary: "#8A8A8A",
  border: "#EFEFEF",

  // Status colors (softer variants)
  error: "#E85A5A",
  errorLight: "#FDEAEA",
  success: "#7BC47F",
  successLight: "#EAF7EB",

  // Overlay
  overlay: "rgba(193, 142, 216, 0.15)",
  overlayDark: "rgba(74, 74, 74, 0.6)",
};

// Gradient presets for LinearGradient components
export const Gradients = {
  // Primary button/accent gradient (purple to lilac)
  primary: ["#C18ED8", "#d4aecd"] as const,
  // Screen background gradient (warm peach to misty rose)
  background: ["#fbebe1", "#ecdadd"] as const,
  // Recording state gradient (soft red)
  recording: ["#FF6B6B", "#EE5A5A"] as const,
  // Subtle card highlight
  cardHighlight: ["#FFFFFF", "#f5e3df"] as const,
};

export const Shadows = {
  soft: {
    shadowColor: "#d4aecd",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  small: {
    shadowColor: "#d4aecd",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
};

export const Colors = {
  light: {
    ...ReluneColors,
    tint: tintColorLight,
    icon: "#8A8A8A",
    tabIconDefault: "#B0B0B0",
    tabIconSelected: tintColorLight,
  },
  dark: {
    ...ReluneColors,
    text: "#ECEDEE", // Override for dark mode
    background: "#151718", // Override for dark mode
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
