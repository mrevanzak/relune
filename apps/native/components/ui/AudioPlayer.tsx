import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { PressableScale } from "pressto";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRecordingPlayer } from "@/hooks/use-audio-player";
import { useThemeColor } from "@/hooks/use-theme-color";
import { formatDuration } from "@/lib/date";

export function AudioPlayer({
  audioUrl,
  durationSeconds,
}: {
  audioUrl: string;
  durationSeconds: number | null | undefined;
}) {
  const player = useRecordingPlayer(audioUrl);
  // Track when user requested play but audio isn't playing yet
  const [isPendingPlay, setIsPendingPlay] = useState(false);

  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tint = useThemeColor({}, "tint");
  const surface = useThemeColor({}, "surface");

  // Clear pending state once audio starts playing
  useEffect(() => {
    if (player.isPlaying) {
      setIsPendingPlay(false);
    }
  }, [player.isPlaying]);

  // Unified loading state: initial load, buffering, or waiting for play to start
  const isLoading = !player.isLoaded || player.isBuffering || isPendingPlay;

  const durationLabel = useMemo(
    () => formatDuration(durationSeconds),
    [durationSeconds]
  );

  const timeLabel = useMemo(() => {
    const current = formatDuration(player.currentTime);
    if (!durationLabel) return current ?? "\u2014";
    return `${current ?? "0:00"} / ${durationLabel}`;
  }, [durationLabel, player.currentTime]);

  const statusLabel = useMemo(() => {
    if (isLoading) return "Loading...";
    if (player.isPlaying) return "Playing";
    return "Ready to play";
  }, [isLoading, player.isPlaying]);

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!player.isPlaying) {
      // Set pending state immediately for instant feedback
      setIsPendingPlay(true);
      // Defer play to next tick so React can re-render with spinner first
      setTimeout(() => {
        player.play();
      }, 0);
    } else {
      player.pause();
    }
  };

  return (
    <View style={styles.container}>
      <PressableScale onPress={handleToggle} style={styles.playButton}>
        <View style={[styles.playButtonInner, { backgroundColor: tint }]}>
          {isLoading ? (
            <ActivityIndicator color={surface} size="small" />
          ) : (
            <Ionicons
              color={surface}
              name={player.isPlaying ? "pause" : "play"}
              size={24}
              style={player.isPlaying ? undefined : styles.playIconOffset}
            />
          )}
        </View>
      </PressableScale>

      <View style={styles.meta}>
        <Text style={[styles.time, { color: text }]}>{timeLabel}</Text>
        <Text style={[styles.status, { color: textSecondary }]}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 16,
  },
  playButton: {
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  playButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  playIconOffset: {
    marginLeft: 4,
  },
  meta: {
    flex: 1,
    gap: 2,
    justifyContent: "center",
  },
  status: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.7,
  },
  time: {
    fontSize: 16,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
