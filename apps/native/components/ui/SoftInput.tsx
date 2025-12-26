import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import { Shadows } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

interface SoftInputProps extends TextInputProps {
	icon?: keyof typeof Ionicons.glyphMap;
}

export function SoftInput({ icon, style, ...props }: SoftInputProps) {
	const surface = useThemeColor({}, "surface");
	const text = useThemeColor({}, "text");
	const textSecondary = useThemeColor({}, "textSecondary");

	return (
		<View style={[styles.container, { backgroundColor: surface }]}>
			{icon && (
				<Ionicons
					name={icon}
					size={20}
					color={textSecondary}
					style={styles.icon}
				/>
			)}
			<TextInput
				style={[styles.input, { color: text }, style]}
				placeholderTextColor={textSecondary}
				{...props}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
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
	},
});
