import { LinearGradient } from "expo-linear-gradient";
import { PressableScale } from "pressto";
import { StyleSheet, Text } from "react-native";
import { Gradients, Shadows } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

interface FilterPillProps {
	label: string;
	isActive?: boolean;
	onPress?: () => void;
}

export function FilterPill({
	label,
	isActive = false,
	onPress,
}: FilterPillProps) {
	const surface = useThemeColor({}, "surface");
	const textSecondary = useThemeColor({}, "textSecondary");

	if (isActive) {
		return (
			<PressableScale style={styles.container} onPress={onPress}>
				<LinearGradient
					colors={Gradients.primary}
					style={styles.gradientContainer}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
				>
					<Text style={[styles.activeText, { color: surface }]}>{label}</Text>
				</LinearGradient>
			</PressableScale>
		);
	}

	return (
		<PressableScale
			style={[
				styles.container,
				styles.inactiveContainer,
				{ backgroundColor: surface },
			]}
			onPress={onPress}
		>
			<Text style={[styles.inactiveText, { color: textSecondary }]}>
				{label}
			</Text>
		</PressableScale>
	);
}

const styles = StyleSheet.create({
	container: {
		borderRadius: 20,
		overflow: "hidden",
		...Shadows.small,
	},
	gradientContainer: {
		paddingHorizontal: 20,
		paddingVertical: 10,
	},
	inactiveContainer: {
		paddingHorizontal: 20,
		paddingVertical: 10,
	},
	activeText: {
		fontSize: 14,
		fontWeight: "600",
	},
	inactiveText: {
		fontSize: 14,
		fontWeight: "500",
	},
});
