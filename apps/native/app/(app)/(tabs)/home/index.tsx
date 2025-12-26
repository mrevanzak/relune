import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useState } from "react";
import {
	FlatList,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AudioCard, type AudioCardProps } from "@/components/ui/AudioCard";
import { FilterPill } from "@/components/ui/FilterPill";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useThemeColor } from "@/hooks/use-theme-color";
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
			"Let's meet at the cafe around 3 PM, then head to the museum exhibition before dinner...",
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

const FILTERS = ["Today", "This Week", "All Time"];

export default function HomeScreen() {
	const { isRecording, start, stop, hasPermission, requestPermission } =
		useAudioRecorder();

	const { mutate: uploadRecording } = useUploadRecordingMutation();

	// Theme colors
	const tint = useThemeColor({}, "tint");
	const text = useThemeColor({}, "text");
	const textSecondary = useThemeColor({}, "textSecondary");
	const surface = useThemeColor({}, "surface");
	const lilac = useThemeColor({}, "lilac");

	const [activeFilter, setActiveFilter] = useState("Today");
	const [searchQuery, setSearchQuery] = useState("");

	// Recording is handled by the tab bar button, but we keep the logic here
	// for potential future use (e.g., floating button overlay)
	void hasPermission;
	void requestPermission;
	void start;
	void stop;
	void uploadRecording;

	// Filter recordings based on search query
	const filteredRecordings = MOCK_RECORDINGS.filter(
		(recording) =>
			recording.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			recording.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
			recording.tags.some((tag) =>
				tag.toLowerCase().includes(searchQuery.toLowerCase()),
			),
	);

	return (
		<SafeAreaView
			edges={["top"]}
			style={[styles.container, { paddingTop: 40 }]}
		>
			{/* Native header configuration */}
			<Stack.Screen
				options={{
					title: "Relune",
					headerTransparent: true,
					headerRight: () => (
						<Pressable
							onPress={() => router.push("/(app)/import")}
							style={styles.headerButton}
							hitSlop={8}
						>
							<Ionicons name="download-outline" size={24} color={tint} />
						</Pressable>
					),
					headerSearchBarOptions: {
						placeholder: "Search by keyword",
						onChangeText: (event) => setSearchQuery(event.nativeEvent.text),
						tintColor: tint,
						headerIconColor: tint,
					},
				}}
			/>

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
				<Text style={[styles.sectionTitle, { color: text }]}>
					Recent Recordings
				</Text>
				<FlatList
					data={filteredRecordings}
					keyExtractor={(_, index) => index.toString()}
					renderItem={({ item }) => <AudioCard {...item} />}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
					ListEmptyComponent={
						<View style={styles.emptyState}>
							<Ionicons name="mic-off-outline" size={48} color={lilac} />
							<Text style={[styles.emptyText, { color: textSecondary }]}>
								No recordings found
							</Text>
						</View>
					}
				/>
			</View>

			{/* Recording Overlay */}
			{isRecording && (
				<View style={styles.recordingOverlay}>
					<View
						style={[
							styles.recordingPill,
							{ backgroundColor: surface, shadowColor: tint },
						]}
					>
						<View style={styles.recordingDot} />
						<Text style={[styles.recordingText, { color: text }]}>
							Recording...
						</Text>
					</View>
				</View>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	headerButton: {
		padding: 8,
	},
	filterContainer: {
		marginTop: 8,
		marginBottom: 8,
	},
	filterContent: {
		paddingHorizontal: 24,
		paddingBottom: 8,
		gap: 8,
	},
	contentContainer: {
		flex: 1,
		paddingHorizontal: 24,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 16,
		marginTop: 8,
	},
	listContent: {
		paddingBottom: 120,
	},
	emptyState: {
		alignItems: "center",
		paddingTop: 60,
		gap: 12,
	},
	emptyText: {
		fontSize: 16,
	},
	recordingOverlay: {
		position: "absolute",
		top: 100,
		alignSelf: "center",
		zIndex: 10,
	},
	recordingPill: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 24,
		gap: 8,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 6,
	},
	recordingDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: "#FF5C5C",
	},
	recordingText: {
		fontWeight: "600",
		fontSize: 14,
	},
});
