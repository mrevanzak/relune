import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { RecordingDetail } from "@/components/RecordingDetail";
import { useThemeColor } from "@/hooks/use-theme-color";
import { recordingQueryOptions } from "@/queries/recordings";

function LoadingState() {
	const tint = useThemeColor({}, "tint");

	return (
		<View style={styles.stateContainer}>
			<ActivityIndicator size="large" color={tint} />
		</View>
	);
}

function ErrorState({ message }: { message: string }) {
	const text = useThemeColor({}, "text");
	const textSecondary = useThemeColor({}, "textSecondary");

	return (
		<View style={[styles.stateContainer]}>
			<Text style={[styles.errorTitle, { color: text }]}>Couldn’t load</Text>
			<Text style={[styles.errorMessage, { color: textSecondary }]}>
				{message}
			</Text>
		</View>
	);
}

export default function RecordingDetailScreen() {
	const { id } = useLocalSearchParams<{ id?: string | string[] }>();
	const recordingId = Array.isArray(id) ? id[0] : (id ?? "");

	const {
		data: recording,
		isLoading,
		error,
	} = useQuery(recordingQueryOptions(recordingId));

	if (!recordingId) {
		return <ErrorState message="Missing recording id." />;
	}

	if (isLoading) {
		return <LoadingState />;
	}

	if (error || !recording) {
		const message =
			error instanceof Error ? error.message : "Recording not found";
		return <ErrorState message={message} />;
	}

	return <RecordingDetail recording={recording} />;
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	stateContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 24,
		gap: 10,
	},
	errorTitle: {
		fontSize: 18,
		fontWeight: "600",
	},
	errorMessage: {
		fontSize: 14,
		textAlign: "center",
		lineHeight: 20,
	},
});
