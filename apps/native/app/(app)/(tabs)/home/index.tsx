import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "@react-navigation/elements";
import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AudioCard } from "@/components/ui/AudioCard";
import { FilterPill } from "@/components/ui/FilterPill";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRecordingPlayer } from "@/hooks/use-audio-player";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useRecordingsWithPolling } from "@/hooks/use-recordings-with-polling";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
	formatDuration,
	formatRelativeDate,
	generateRecordingTitle,
	isDateThisWeek,
	isDateToday,
} from "@/lib/date";

const FILTERS = ["Today", "This Week", "All Time"];

export default function HomeScreen() {
	const { isRecording } = useAudioRecorder();

	// Fetch recordings from server (with smart polling)
	const {
		data: recordings = [],
		isLoading,
		error,
	} = useRecordingsWithPolling();

	// Currently playing recording
	const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(
		null,
	);
	const currentAudioUrl = useMemo(
		() => recordings.find((r) => r.id === currentlyPlayingId)?.audioUrl ?? null,
		[recordings, currentlyPlayingId],
	);
	const player = useRecordingPlayer(currentAudioUrl);

	// Theme colors
	const tint = useThemeColor({}, "tint");
	const text = useThemeColor({}, "text");
	const textSecondary = useThemeColor({}, "textSecondary");
	const surface = useThemeColor({}, "surface");
	const lilac = useThemeColor({}, "lilac");

	const [activeFilter, setActiveFilter] = useState("All Time");
	const [searchQuery, setSearchQuery] = useState("");

	// Filter recordings based on search query and time filter
	const filteredRecordings = useMemo(() => {
		return recordings.filter((recording) => {
			// Time filter
			if (activeFilter === "Today" && !isDateToday(recording.recordedAt)) {
				return false;
			}
			if (
				activeFilter === "This Week" &&
				!isDateThisWeek(recording.recordedAt)
			) {
				return false;
			}

			// Search filter
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				const titleMatch = generateRecordingTitle(recording.recordedAt)
					.toLowerCase()
					.includes(query);
				const transcriptMatch = recording.transcript
					?.toLowerCase()
					.includes(query);
				const keywordMatch = recording.keywords.some((kw) =>
					kw.name.toLowerCase().includes(query),
				);
				return titleMatch || transcriptMatch || keywordMatch;
			}

			return true;
		});
	}, [recordings, activeFilter, searchQuery]);

	// Handle play button press
	const handlePlay = (recordingId: string) => {
		if (currentlyPlayingId === recordingId) {
			player.togglePlayPause();
		} else {
			setCurrentlyPlayingId(recordingId);
			// Player will auto-play when URL changes
		}
	};

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
						<HeaderButton onPress={() => router.push("/import")}>
							<IconSymbol name="square.and.arrow.up" size={24} color={tint} />
						</HeaderButton>
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

				{isLoading ? (
					<View style={styles.loadingState}>
						<ActivityIndicator size="large" color={tint} />
					</View>
				) : error ? (
					<View style={styles.emptyState}>
						<Ionicons name="alert-circle-outline" size={48} color={lilac} />
						<Text style={[styles.emptyText, { color: textSecondary }]}>
							Failed to load recordings
						</Text>
					</View>
				) : (
					<FlatList
						data={filteredRecordings}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => (
							<AudioCard
								title={generateRecordingTitle(item.recordedAt)}
								date={formatRelativeDate(item.recordedAt)}
								description={item.transcript ?? undefined}
								tags={item.keywords.map((kw) => kw.name)}
								duration={formatDuration(item.durationSeconds) ?? undefined}
								isPlaying={currentlyPlayingId === item.id && player.isPlaying}
								onPlay={() => handlePlay(item.id)}
								onPress={() => router.push(`/recording/${item.id}`)}
								isTranscribing={
									item.transcript === null || item.transcript === undefined
								}
							/>
						)}
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
				)}
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
	loadingState: {
		alignItems: "center",
		paddingTop: 60,
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
