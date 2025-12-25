import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";

function formatDuration(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function RecordScreen() {
	const { isRecording, start, stop, hasPermission, requestPermission } =
		useAudioRecorder();

	const [displayDuration, setDisplayDuration] = useState(0);
	const [lastRecording, setLastRecording] = useState<{
		uri: string;
		durationSeconds: number;
	} | null>(null);

	// Update duration display while recording
	useEffect(() => {
		if (!isRecording) {
			return;
		}

		const startTime = Date.now();
		const interval = setInterval(() => {
			setDisplayDuration(Date.now() - startTime);
		}, 100);

		return () => {
			clearInterval(interval);
			setDisplayDuration(0);
		};
	}, [isRecording]);

	const handleRecordPress = useCallback(async () => {
		if (isRecording) {
			const result = await stop();
			if (result) {
				setLastRecording(result);
			}
		} else {
			setLastRecording(null);
			await start();
		}
	}, [isRecording, start, stop]);

	const handlePermissionPress = useCallback(async () => {
		await requestPermission();
	}, [requestPermission]);

	if (!hasPermission) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>Relune</Text>
				<Text style={styles.subtitle}>Microphone access required</Text>
				<Pressable
					style={styles.permissionButton}
					onPress={handlePermissionPress}
				>
					<Text style={styles.permissionButtonText}>Grant Permission</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Relune</Text>

			{isRecording && (
				<View style={styles.durationContainer}>
					<View style={styles.recordingIndicator} />
					<Text style={styles.duration}>{formatDuration(displayDuration)}</Text>
				</View>
			)}

			{lastRecording && !isRecording && (
				<View style={styles.resultContainer}>
					<Text style={styles.resultText}>
						Recording saved ({lastRecording.durationSeconds}s)
					</Text>
				</View>
			)}

			<Pressable
				style={[styles.recordButton, isRecording && styles.recordButtonActive]}
				onPress={handleRecordPress}
			>
				<View
					style={[
						styles.recordButtonInner,
						isRecording && styles.recordButtonInnerActive,
					]}
				/>
			</Pressable>

			<Text style={styles.hint}>
				{isRecording ? "Tap to stop" : "Tap to record"}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
		padding: 20,
	},
	title: {
		fontSize: 32,
		fontWeight: "bold",
		color: "#fff",
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: "#888",
		marginBottom: 32,
	},
	permissionButton: {
		backgroundColor: "#fff",
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
	},
	permissionButtonText: {
		color: "#000",
		fontSize: 16,
		fontWeight: "600",
	},
	durationContainer: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 40,
	},
	recordingIndicator: {
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: "#ff3b30",
		marginRight: 8,
	},
	duration: {
		fontSize: 48,
		fontWeight: "300",
		color: "#fff",
		fontVariant: ["tabular-nums"],
	},
	resultContainer: {
		marginBottom: 40,
	},
	resultText: {
		fontSize: 16,
		color: "#34c759",
	},
	recordButton: {
		width: 80,
		height: 80,
		borderRadius: 40,
		borderWidth: 4,
		borderColor: "#fff",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 16,
	},
	recordButtonActive: {
		borderColor: "#ff3b30",
	},
	recordButtonInner: {
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: "#ff3b30",
	},
	recordButtonInnerActive: {
		width: 28,
		height: 28,
		borderRadius: 4,
	},
	hint: {
		fontSize: 14,
		color: "#888",
	},
});
