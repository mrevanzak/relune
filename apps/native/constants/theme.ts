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
