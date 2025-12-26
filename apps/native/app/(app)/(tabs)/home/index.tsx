import { useCallback, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { AudioCard, type AudioCardProps } from "@/components/ui/AudioCard";
import { FilterPill } from "@/components/ui/FilterPill";
import { ReluneColors } from "@/constants/theme";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useUploadRecordingMutation } from "@/queries/recordings";

// Mock Data
const MOCK_RECORDINGS: AudioCardProps[] = [
	{
		title: "Project Update",
		date: "Today, 9:45 AM",
		description:
			"I finished the report and sent it over. Let's discuss the next steps for the Q3 roadmap...",
		tags: ["work", "deadline"],
		duration: "0:45",
	},
	{
		title: "Weekend Plans",
		date: "Yesterday, 4:30 PM",
		description:
			"Let's meet at the café around 3 PM, then head to the museum exhibition before dinner...",
		tags: ["plans", "weekend"],
		duration: "1:20",
	},
	{
		title: "Investment Ideas",
		date: "Apr 14, 11:15 AM",
		description:
			"I was thinking about that new opportunity in the tech sector regarding AI startups...",
		tags: ["finance", "opportunity"],
		duration: "3:10",
	},
	{
		title: "Travel Notes",
		date: "Apr 10, 8:20 PM",
		description:
			"Remember to pack the documents and book the hotel for the second leg of the trip...",
		tags: ["travel", "documents"],
		duration: "2:05",
	},
];

const FILTERS = ["Date", "Today", "This Week", "Range"];

export default function HomeScreen() {
	const { isRecording, start, stop, hasPermission, requestPermission } =
		useAudioRecorder();

	const { mutate: uploadRecording } = useUploadRecordingMutation();

	const [activeFilter, setActiveFilter] = useState("Today");

	const handleRecordPress = useCallback(async () => {
		if (!hasPermission) {
			await requestPermission();
			return;
		}

		if (isRecording) {
			const result = await stop();
			if (result) {
				// Upload logic here
				uploadRecording(
					{
						uri: result.uri,
						durationSeconds: result.durationSeconds,
						recordedAt: new Date(),
					},
					{
						onError: (error) => {
							console.log("Upload error", error);
						},
					},
				);
			}
		} else {
			await start();
		}
	}, [
		isRecording,
		hasPermission,
		requestPermission,
		start,
		stop,
		uploadRecording,
	]);

	return (
		<View style={styles.container}>
			{/* Filters */}
			<View style={styles.filterContainer}>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.filterContent}
				>
					{FILTERS.map((filter) => (
						<FilterPill
							key={filter}
							label={filter}
							isActive={activeFilter === filter}
							onPress={() => setActiveFilter(filter)}
						/>
					))}
				</ScrollView>
			</View>

			{/* Content */}
			<View style={styles.contentContainer}>
				<Text style={styles.sectionTitle}>Recent Recordings</Text>
				<FlatList
					data={MOCK_RECORDINGS}
					keyExtractor={(item, index) => index.toString()}
					renderItem={({ item }) => <AudioCard {...item} />}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
				/>
			</View>

			{/* Recording Overlay / Button */}
			{isRecording && (
				<View style={styles.recordingOverlay}>
					<Text style={styles.recordingText}>Recording...</Text>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	filterContainer: {
		marginBottom: 8,
	},
	filterContent: {
		paddingHorizontal: 24,
		paddingBottom: 8,
	},
	contentContainer: {
		flex: 1,
		paddingHorizontal: 24,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: ReluneColors.text,
		marginBottom: 16,
		marginTop: 8,
	},
	listContent: {
		paddingBottom: 120, // Space for floating button
	},
	recordingOverlay: {
		position: "absolute",
		top: 200,
		alignSelf: "center",
		backgroundColor: ReluneColors.primaryPurple,
		padding: 12,
		borderRadius: 20,
		zIndex: 10,
	},
	recordingText: {
		color: "white",
		fontWeight: "600",
	},
});
