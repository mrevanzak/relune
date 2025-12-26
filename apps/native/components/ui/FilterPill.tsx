import { ReluneColors, Shadows } from "@/constants/theme";
import { StyleSheet, Text } from "react-native";
import { PressableScale } from "pressto";

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
	return (
		<PressableScale
			style={[
				styles.container,
				isActive ? styles.activeContainer : styles.inactiveContainer,
			]}
			onPress={onPress}
		>
			<Text
				style={[
					styles.text,
					isActive ? styles.activeText : styles.inactiveText,
				]}
			>
				{label}
			</Text>
		</PressableScale>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 20,
		marginRight: 12,
		...Shadows.small,
	},
	activeContainer: {
		backgroundColor: ReluneColors.darkPeach,
	},
	inactiveContainer: {
		backgroundColor: ReluneColors.surface,
	},
	text: {
		fontSize: 14,
		fontWeight: "600",
		fontFamily: "System",
	},
	activeText: {
		color: ReluneColors.text,
	},
	inactiveText: {
		color: ReluneColors.textSecondary,
	},
});
