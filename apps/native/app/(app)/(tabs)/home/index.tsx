import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "@react-navigation/elements";
import { Link, router, Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AudioCard } from "@/components/ui/AudioCard";
import { FilterPill } from "@/components/ui/FilterPill";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Fonts } from "@/constants/theme";
import { useSession } from "@/context/session";
import {
  useArchiveRecordingMutation,
  useDeleteRecordingMutation,
  useRecordingsWithPolling,
  useUnarchiveRecordingMutation,
} from "@/features/recordings";
import { useSettings } from "@/features/settings";
import { useRecordingPlayer } from "@/hooks/use-audio-player";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  formatDuration,
  formatRelativeDate,
  isDateThisWeek,
  isDateToday,
} from "@/lib/date";

type Tab = "current" | "archived";

const TABS = ["Current", "Archived"];
const CURRENT_FILTERS = ["Today", "This Week", "All Time"];
const ARCHIVED_FILTERS = ["All", "From Me", "From Partner"];

function HeaderTitle() {
  const tint = useThemeColor({}, "tint");
  // Use serif font + italic to mimic the script look from the design
  const fontFamily =
    Fonts?.serif ?? (Platform.OS === "ios" ? "Georgia" : "serif");

  return (
    <Text style={[styles.headerTitle, { color: tint, fontFamily }]}>
      Relune
    </Text>
  );
}

export default function HomeScreen() {
  const { session } = useSession();
  const currentUserId = session?.user?.id;
  const { isRecording } = useAudioRecorder();
  const deleteMutation = useDeleteRecordingMutation();
  const archiveMutation = useArchiveRecordingMutation();
  const unarchiveMutation = useUnarchiveRecordingMutation();

  // prefetch settings query
  useSettings();

  // Tab state
  const [tabIndex, setTabIndex] = useState(0);
  const activeTab: Tab = tabIndex === 0 ? "current" : "archived";

  // Filter state - reset when tab changes
  const [activeFilter, setActiveFilter] = useState("All Time");
  const filters = activeTab === "current" ? CURRENT_FILTERS : ARCHIVED_FILTERS;

  // Reset filter when tab changes
  useEffect(() => {
    setActiveFilter(activeTab === "current" ? "All Time" : "All");
  }, [activeTab]);

  // Search state with debounce for server-side search
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
    tab: activeTab,
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

  // Filter recordings based on active filter (client-side)
  const filteredRecordings = useMemo(() => {
    return recordings.filter((recording) => {
      if (activeTab === "current") {
        // Time filter for current tab
        if (activeFilter === "Today" && !isDateToday(recording.recordedAt)) {
          return false;
        }
        if (
          activeFilter === "This Week" &&
          !isDateThisWeek(recording.recordedAt)
        ) {
          return false;
        }
        // "All Time" shows all
      } else {
        // Sender filter for archived tab
        if (currentUserId) {
          const isFromMe = recording.senderId === currentUserId;
          if (activeFilter === "From Me" && !isFromMe) {
            return false;
          }
          if (activeFilter === "From Partner" && isFromMe) {
            return false;
          }
        }
        // "All" shows all archived recordings
      }
      return true;
    });
  }, [recordings, activeFilter, activeTab, currentUserId]);

  // Handle play button press
  const handlePlay = useCallback(
    (recordingId: string) => {
      const isCurrentlyPlaying =
        currentlyPlayingId === recordingId && player.isPlaying;

      // Only show spinner when we're about to PLAY (not pause)
      if (!isCurrentlyPlaying) {
        setPendingPlayId(recordingId);
      }

      // Defer the actual play action to allow React to re-render with spinner first
      setTimeout(() => {
        if (currentlyPlayingId === recordingId) {
          player.togglePlayPause();
        } else {
          setCurrentlyPlayingId(recordingId);
          // Player will auto-play when URL changes
        }
      }, 0);
    },
    [currentlyPlayingId, player]
  );

  // Handle delete with confirmation
  const handleDelete = useCallback(
    (recordingId: string, recordingTitle: string) => {
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
    },
    [deleteMutation]
  );

  // Handle archive
  const handleArchive = useCallback(
    (recordingId: string, recordingTitle: string) => {
      Alert.alert(
        "Archive Recording",
        `Move "${recordingTitle}" to Archived?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Archive",
            onPress: () => {
              archiveMutation.mutate({ id: recordingId });
            },
          },
        ]
      );
    },
    [archiveMutation]
  );

  // Handle unarchive
  const handleUnarchive = useCallback(
    (recordingId: string) => {
      unarchiveMutation.mutate({ id: recordingId });
    },
    [unarchiveMutation]
  );

  // Render content based on state
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator color={tint} size="large" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Ionicons color={lilac} name="alert-circle-outline" size={48} />
          <Text style={[styles.emptyText, { color: textSecondary }]}>
            Failed to load recordings
          </Text>
        </View>
      );
    }

    return (
      <FlatList
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
          const isArchived = activeTab === "archived";
          const isFromMe = currentUserId
            ? item.senderId === currentUserId
            : false;
          // Use senderName, fall back to "Unknown" if not available
          const senderName = item.senderName ?? "Unknown";
          // For delete/archive confirmations, use date as identifier
          const itemLabel = formatRelativeDate(item.recordedAt);

          return (
            <Link href={`/recording/${item.id}`}>
              <Link.Trigger>
                <View style={{ width: "100%" }}>
                  <AudioCard
                    date={formatRelativeDate(item.recordedAt)}
                    description={item.transcript ?? undefined}
                    duration={formatDuration(item.durationSeconds) ?? undefined}
                    importedAt={
                      item.importedAt ? new Date(item.importedAt) : undefined
                    }
                    importedByName={item.importedByName ?? undefined}
                    importSource={isArchived ? item.importSource : undefined}
                    isBuffering={
                      pendingPlayId === item.id ||
                      (currentlyPlayingId === item.id && player.isBuffering)
                    }
                    isFromMe={isFromMe}
                    isPlaying={
                      currentlyPlayingId === item.id && player.isPlaying
                    }
                    isTranscribing={
                      item.transcript === null || item.transcript === undefined
                    }
                    onPlay={() => handlePlay(item.id)}
                    senderName={senderName}
                    tags={item.keywords.map((kw) => kw.name)}
                  />
                </View>
              </Link.Trigger>
              <Link.Menu>
                {activeTab === "current" ? (
                  <Link.MenuAction
                    icon="archivebox"
                    onPress={() => handleArchive(item.id, itemLabel)}
                    title="Archive"
                  />
                ) : (
                  <Link.MenuAction
                    icon="tray.and.arrow.up"
                    onPress={() => handleUnarchive(item.id)}
                    title="Unarchive"
                  />
                )}
                <Link.MenuAction
                  destructive
                  icon="trash"
                  onPress={() => handleDelete(item.id, itemLabel)}
                  title="Delete"
                />
              </Link.Menu>
            </Link>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: 64 }]}>
      {/* Native header configuration */}
      <Stack.Screen
        options={{
          headerTitle: () => <HeaderTitle />,
          title: "", // Clear default title string
          headerTransparent: true,
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <HeaderButton onPress={() => router.push("/import")}>
                <IconSymbol color={tint} name="square.and.arrow.up" size={24} />
              </HeaderButton>
              <HeaderButton onPress={() => router.push("/settings")}>
                <IconSymbol color={tint} name="gearshape" size={24} />
              </HeaderButton>
            </View>
          ),
          headerSearchBarOptions: {
            placeholder: "Search by keyword",
            onChangeText: (event) => setSearchQuery(event.nativeEvent.text),
            tintColor: tint,
            headerIconColor: tint,
          },
        }}
      />

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <SegmentedControl
          onChange={setTabIndex}
          segments={TABS}
          selectedIndex={tabIndex}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView
          contentContainerStyle={styles.filterContent}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {filters.map((filter) => (
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
      <View style={styles.contentContainer}>{renderContent()}</View>

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
  headerTitle: {
    fontSize: 28,
    fontWeight: "400",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  tabContainer: {
    paddingHorizontal: 24,
    marginBottom: 8,
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
  },
  listContent: {
    paddingBottom: 96,
    paddingHorizontal: 24,
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
