import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PressableScale } from "pressto";
import { StyleSheet, View } from "react-native";
import { Gradients, Shadows } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

interface RecordButtonProps {
	onPress?: () => void;
	isRecording?: boolean;
}

export function RecordButton({ onPress, isRecording }: RecordButtonProps) {
	const surface = useThemeColor({}, "surface");
	const tint = useThemeColor({}, "tint");
	const lilac = useThemeColor({}, "lilac");

	return (
		<PressableScale
			style={styles.container}
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={isRecording ? "Stop Recording" : "Start Recording"}
		>
			<View
				style={[
					styles.outerRing,
					{ backgroundColor: surface, shadowColor: tint },
					isRecording && styles.recordingRing,
				]}
			>
				<LinearGradient
					colors={isRecording ? Gradients.recording : [tint, lilac]}
					style={styles.innerCircle}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
				>
					<Ionicons
						name={isRecording ? "square" : "mic"}
						size={32}
						color={surface}
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
		alignItems: "center",
		justifyContent: "center",
		...Shadows.soft,
		shadowOpacity: 0.3,
	},
	recordingRing: {
		transform: [{ scale: 1.1 }],
	},
	innerCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: "center",
		justifyContent: "center",
	},
});
