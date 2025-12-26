import { LinearGradient } from "expo-linear-gradient";
import { PressableScale } from "pressto";
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	type ViewStyle,
} from "react-native";
import { Gradients, Shadows } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

interface SoftButtonProps {
	title: string;
	onPress?: () => void;
	disabled?: boolean;
	loading?: boolean;
	variant?: "primary" | "secondary" | "ghost";
	style?: ViewStyle;
}

/**
 * A soft, gradient-styled button with brand aesthetics.
 * Primary: Purple gradient with white text
 * Secondary: White background with purple text
 * Ghost: Transparent with purple text
 */
export function SoftButton({
	title,
	onPress,
	disabled = false,
	loading = false,
	variant = "primary",
	style,
}: SoftButtonProps) {
	const surface = useThemeColor({}, "surface");
	const tint = useThemeColor({}, "tint");
	const lilac = useThemeColor({}, "lilac");

	const isDisabled = disabled || loading;

	const handlePress = () => {
		if (!isDisabled && onPress) {
			onPress();
		}
	};

	if (variant === "primary") {
		return (
			<PressableScale
				onPress={handlePress}
				style={[styles.container, isDisabled && styles.disabled, style]}
			>
				<LinearGradient
					colors={Gradients.primary}
					style={styles.gradient}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
				>
					{loading ? (
						<ActivityIndicator color={surface} size="small" />
					) : (
						<Text style={[styles.primaryText, { color: surface }]}>
							{title}
						</Text>
					)}
				</LinearGradient>
			</PressableScale>
		);
	}

	return (
		<PressableScale
			onPress={handlePress}
			style={[
				styles.container,
				variant === "secondary"
					? [styles.secondary, { backgroundColor: surface, borderColor: lilac }]
					: styles.ghost,
				isDisabled && styles.disabled,
				style,
			]}
		>
			{loading ? (
				<ActivityIndicator color={tint} size="small" />
			) : (
				<Text
					style={[
						styles.secondaryText,
						{ color: tint },
						variant === "ghost" && styles.ghostText,
					]}
				>
					{title}
				</Text>
			)}
		</PressableScale>
	);
}

const styles = StyleSheet.create({
	container: {
		borderRadius: 16,
		overflow: "hidden",
		...Shadows.small,
	},
	gradient: {
		paddingVertical: 16,
		paddingHorizontal: 24,
		alignItems: "center",
		justifyContent: "center",
	},
	secondary: {
		paddingVertical: 16,
		paddingHorizontal: 24,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},
	ghost: {
		backgroundColor: "transparent",
		paddingVertical: 16,
		paddingHorizontal: 24,
		alignItems: "center",
		justifyContent: "center",
		shadowOpacity: 0,
		elevation: 0,
	},
	disabled: {
		opacity: 0.5,
	},
	primaryText: {
		fontSize: 16,
		fontWeight: "600",
	},
	secondaryText: {
		fontSize: 16,
		fontWeight: "600",
	},
	ghostText: {
		fontWeight: "500",
	},
});
