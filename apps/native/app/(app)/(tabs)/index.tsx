import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { isNetworkError } from "@/lib/api";
import { useUploadRecordingMutation } from "@/queries/recordings";
import { useUploadQueueStore } from "@/stores/upload-queue";

function formatDuration(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

type UploadStatus = "idle" | "uploading" | "success" | "queued" | "error";

export default function RecordScreen() {
	const { isRecording, start, stop, hasPermission, requestPermission } =
		useAudioRecorder();

	const { mutate: uploadRecording, isPending: isUploading } =
		useUploadRecordingMutation();
	const queueLength = useUploadQueueStore.use.queue().length;

	const [displayDuration, setDisplayDuration] = useState(0);
	const [lastRecording, setLastRecording] = useState<{
		uri: string;
		durationSeconds: number;
	} | null>(null);
	const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");

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
				setUploadStatus("uploading");

				// Auto-upload the recording
				uploadRecording(
					{
						uri: result.uri,
						durationSeconds: result.durationSeconds,
						recordedAt: new Date(),
					},
					{
						onSuccess: () => {
							setUploadStatus("success");
						},
						onError: (error) => {
							// Check if it was queued for later (network error)
							const isQueued = isNetworkError(error);
							setUploadStatus(isQueued ? "queued" : "error");
						},
					},
				);
			}
		} else {
			setLastRecording(null);
			setUploadStatus("idle");
			await start();
		}
	}, [isRecording, start, stop, uploadRecording]);

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
					{uploadStatus === "uploading" || isUploading ? (
						<View style={styles.uploadingContainer}>
							<ActivityIndicator size="small" color="#fff" />
							<Text style={styles.uploadingText}>Uploading...</Text>
						</View>
					) : uploadStatus === "success" ? (
						<Text style={styles.successText}>Saved</Text>
					) : uploadStatus === "queued" ? (
						<Text style={styles.queuedText}>Queued for upload</Text>
					) : uploadStatus === "error" ? (
						<Text style={styles.errorText}>Upload failed</Text>
					) : (
						<Text style={styles.resultText}>
							Recording saved ({lastRecording.durationSeconds}s)
						</Text>
					)}
				</View>
			)}

			{queueLength > 0 && !isRecording && (
				<Text style={styles.queueInfo}>
					{queueLength} recording{queueLength > 1 ? "s" : ""} pending upload
				</Text>
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
		alignItems: "center",
	},
	resultText: {
		fontSize: 16,
		color: "#34c759",
	},
	uploadingContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	uploadingText: {
		fontSize: 16,
		color: "#888",
	},
	successText: {
		fontSize: 16,
		color: "#34c759",
	},
	queuedText: {
		fontSize: 16,
		color: "#ff9500",
	},
	errorText: {
		fontSize: 16,
		color: "#ff3b30",
	},
	queueInfo: {
		fontSize: 12,
		color: "#666",
		marginTop: 8,
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
