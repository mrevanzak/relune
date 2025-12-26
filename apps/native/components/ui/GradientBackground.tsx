import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import { Gradients } from "@/constants/theme";

interface GradientBackgroundProps {
	children: ReactNode;
	style?: ViewStyle;
	/** Use a custom gradient or default to background gradient */
	colors?: readonly [string, string, ...string[]];
}

/**
 * A full-screen gradient background wrapper.
 * Provides consistent brand gradient across all screens.
 */
export function GradientBackground({
	children,
	style,
	colors = Gradients.background,
}: GradientBackgroundProps) {
	return (
		<LinearGradient
			colors={colors}
			style={[styles.container, style]}
			start={{ x: 0.5, y: 0 }}
			end={{ x: 0.5, y: 1 }}
		>
			{children}
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
