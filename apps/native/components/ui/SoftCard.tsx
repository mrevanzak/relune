import { StyleSheet, View, type ViewProps } from "react-native";
import { ReluneColors, Shadows } from "@/constants/theme";

interface SoftCardProps extends ViewProps {
	variant?: "surface" | "highlight";
}

export function SoftCard({
	style,
	variant = "surface",
	children,
	...props
}: SoftCardProps) {
	return (
		<View
			style={[
				styles.card,
				{
					backgroundColor:
						variant === "surface"
							? ReluneColors.surface
							: ReluneColors.surfaceHighlight,
				},
				style,
			]}
			{...props}
		>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 24,
		padding: 16,
		...Shadows.soft,
	},
});
