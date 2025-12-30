import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "@react-navigation/elements";
import { Link, router, Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  useDeleteRecordingMutation,
  useRecordingsWithPolling,
} from "@/features/recordings";
import { useRecordingPlayer } from "@/hooks/use-audio-player";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
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
  const deleteMutation = useDeleteRecordingMutation();

  // Search state with debounce for server-side search
  const [activeFilter, setActiveFilter] = useState("All Time");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query for server-side search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch recordings from server (with smart polling and server-side search)
  const {
    data: recordings = [],
    isLoading,
    error,
  } = useRecordingsWithPolling({
    search: debouncedSearch || undefined,
  });

  // Currently playing recording
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(
    null
  );
  // Track when user requested play but audio isn't playing yet (for instant feedback)
  const [pendingPlayId, setPendingPlayId] = useState<string | null>(null);

  const currentAudioUrl = useMemo(
    () => recordings.find((r) => r.id === currentlyPlayingId)?.audioUrl ?? null,
    [recordings, currentlyPlayingId]
  );
  const player = useRecordingPlayer(currentAudioUrl, { autoPlay: true });

  // Clear pending state once audio starts playing
  useEffect(() => {
    if (player.isPlaying) {
      setPendingPlayId(null);
    }
  }, [player.isPlaying]);

  // Theme colors
  const tint = useThemeColor({}, "tint");
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const surface = useThemeColor({}, "surface");
  const lilac = useThemeColor({}, "lilac");

  // Filter recordings based on time filter only (search is server-side)
  const filteredRecordings = useMemo(() => {
    return recordings.filter((recording) => {
      // Time filter only - search is handled by server
      if (activeFilter === "Today" && !isDateToday(recording.recordedAt)) {
        return false;
      }
      if (
        activeFilter === "This Week" &&
        !isDateThisWeek(recording.recordedAt)
      ) {
        return false;
      }
      return true;
    });
  }, [recordings, activeFilter]);

  // Handle play button press
  const handlePlay = (recordingId: string) => {
    // Set pending state immediately for instant UI feedback
    setPendingPlayId(recordingId);

    // Defer the actual play action to allow React to re-render with spinner first
    setTimeout(() => {
      if (currentlyPlayingId === recordingId) {
        player.togglePlayPause();
      } else {
        setCurrentlyPlayingId(recordingId);
        // Player will auto-play when URL changes
      }
    }, 0);
  };

  // Handle delete with confirmation
  const handleDelete = (recordingId: string, recordingTitle: string) => {
    Alert.alert(
      "Delete Recording",
      `Are you sure you want to delete "${recordingTitle}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate({ id: recordingId });
          },
        },
      ]
    );
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
              <IconSymbol color={tint} name="square.and.arrow.up" size={24} />
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
          contentContainerStyle={styles.filterContent}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {FILTERS.map((filter) => (
            <FilterPill
              isActive={activeFilter === filter}
              key={filter}
              label={filter}
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
            <ActivityIndicator color={tint} size="large" />
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Ionicons color={lilac} name="alert-circle-outline" size={48} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>
              Failed to load recordings
            </Text>
          </View>
        ) : (
          <FlatList
            clipToPadding={false}
            contentContainerStyle={styles.listContent}
            data={filteredRecordings}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons color={lilac} name="mic-off-outline" size={48} />
                <Text style={[styles.emptyText, { color: textSecondary }]}>
                  No recordings found
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const title = generateRecordingTitle(item.recordedAt);
              return (
                <Link href={`/recording/${item.id}`}>
                  <Link.Trigger>
                    <View style={{ width: "100%" }}>
                      <AudioCard
                        date={formatRelativeDate(item.recordedAt)}
                        description={item.transcript ?? undefined}
                        duration={
                          formatDuration(item.durationSeconds) ?? undefined
                        }
                        isBuffering={
                          pendingPlayId === item.id ||
                          (currentlyPlayingId === item.id && player.isBuffering)
                        }
                        isPlaying={
                          currentlyPlayingId === item.id && player.isPlaying
                        }
                        isTranscribing={
                          item.transcript === null ||
                          item.transcript === undefined
                        }
                        onPlay={() => handlePlay(item.id)}
                        tags={item.keywords.map((kw) => kw.name)}
                        title={title}
                      />
                    </View>
                  </Link.Trigger>
                  <Link.Menu>
                    <Link.MenuAction
                      destructive
                      icon="trash"
                      onPress={() => handleDelete(item.id, title)}
                      title="Delete"
                    />
                  </Link.Menu>
                </Link>
              );
            }}
            showsVerticalScrollIndicator={false}
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
    // Removed paddingHorizontal to prevent shadow clipping
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    marginTop: 8,
    paddingHorizontal: 24, // Added padding here
  },
  listContent: {
    paddingBottom: 96,
    paddingHorizontal: 24, // Added padding here for FlatList content
  },
  loadingState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
    paddingHorizontal: 24,
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
