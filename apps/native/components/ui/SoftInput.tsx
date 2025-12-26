import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import { ReluneColors, Shadows } from "@/constants/theme";

interface SoftInputProps extends TextInputProps {
	icon?: keyof typeof Ionicons.glyphMap;
}

export function SoftInput({ icon, style, ...props }: SoftInputProps) {
	return (
		<View style={styles.container}>
			{icon && (
				<Ionicons
					name={icon}
					size={20}
					color={ReluneColors.textSecondary}
					style={styles.icon}
				/>
			)}
			<TextInput
				style={[styles.input, style]}
				placeholderTextColor={ReluneColors.textSecondary}
				{...props}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: ReluneColors.surface,
		borderRadius: 20,
		paddingHorizontal: 16,
		height: 48,
		...Shadows.small,
	},
	icon: {
		marginRight: 8,
	},
	input: {
		flex: 1,
		fontSize: 16,
		color: ReluneColors.text,
		fontFamily: "System", // Will rely on system rounded if applied globally or default
	},
});
