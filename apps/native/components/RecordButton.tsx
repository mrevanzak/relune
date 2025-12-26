import { ReluneColors, Shadows } from "@/constants/theme";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "pressto";
import { LinearGradient } from "expo-linear-gradient";

interface RecordButtonProps {
	onPress?: () => void;
	isRecording?: boolean;
}

export function RecordButton({ onPress, isRecording }: RecordButtonProps) {
	return (
		<PressableScale
			style={styles.container}
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={isRecording ? "Stop Recording" : "Start Recording"}
		>
			<View style={[styles.outerRing, isRecording && styles.recordingRing]}>
				<LinearGradient
					colors={
						isRecording
							? ["#FF5C5C", "#D92E2E"] // Red gradient for recording
							: [ReluneColors.primaryPurple, ReluneColors.lilac] // Purple gradient for idle
					}
					style={styles.innerCircle}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
				>
					<Ionicons
						name={isRecording ? "square" : "mic"}
						size={32}
						color={ReluneColors.surface}
					/>
				</LinearGradient>
			</View>
		</PressableScale>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		justifyContent: "center",
	},
	outerRing: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: ReluneColors.surface, // White ring
		alignItems: "center",
		justifyContent: "center",
		...Shadows.soft, // Soft shadow for lift
		shadowColor: ReluneColors.primaryPurple, // Color tint the shadow
		shadowOpacity: 0.3,
	},
	recordingRing: {
		transform: [{ scale: 1.1 }], // Pulse effect placeholder
	},
	innerCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: "center",
		justifyContent: "center",
	},
});
