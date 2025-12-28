import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { PressableScale } from "pressto";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
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

  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tint = useThemeColor({}, "tint");
  const surface = useThemeColor({}, "surface");

  const durationLabel = useMemo(
    () => formatDuration(durationSeconds),
    [durationSeconds]
  );

  const timeLabel = useMemo(() => {
    const current = formatDuration(player.currentTime);
    if (!durationLabel) return current ?? "—";
    return `${current ?? "0:00"} / ${durationLabel}`;
  }, [durationLabel, player.currentTime]);

  const handleToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    player.togglePlayPause();
  };

  return (
    <View style={styles.container}>
      <PressableScale onPress={handleToggle} style={styles.playButton}>
        <View style={[styles.playButtonInner, { backgroundColor: tint }]}>
          <Ionicons
            color={surface}
            name={player.isPlaying ? "pause" : "play"}
            size={24}
            style={player.isPlaying ? undefined : styles.playIconOffset}
          />
        </View>
      </PressableScale>

      <View style={styles.meta}>
        <Text style={[styles.time, { color: text }]}>{timeLabel}</Text>
        <Text style={[styles.status, { color: textSecondary }]}>
          {player.isPlaying ? "Playing" : "Ready to play"}
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
