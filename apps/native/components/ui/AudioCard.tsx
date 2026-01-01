import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { PressableScale } from "pressto";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
import { SoftCard } from "./SoftCard";

export type ImportSource = "app" | "whatsapp";

export interface AudioCardProps {
  senderName: string;
  date: string;
  description?: string;
  tags: string[];
  duration?: string;
  isPlaying?: boolean;
  isBuffering?: boolean;
  onPlay?: () => void;
  isTranscribing?: boolean;
  isFromMe?: boolean;
  importSource?: ImportSource;
  importedAt?: Date;
  importedByName?: string;
}

const SOURCE_CONFIG = {
  whatsapp: {
    icon: "logo-whatsapp",
    label: "WhatsApp",
    color: "#25D366",
  },
  app: { icon: "archive", label: "Archived", color: "#d4aecd" }, // lilac
} as const;

function formatImportedDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Generate a DiceBear avatar URL based on name
 * Using "initials" style for clean, professional look
 */
function getAvatarUrl(name: string): string {
  const seed = encodeURIComponent(name.toLowerCase().trim());
  return `https://api.dicebear.com/9.x/initials/png?seed=${seed}&backgroundColor=d4aecd,c8b6d4,e8d5e0&backgroundType=gradientLinear&fontSize=42&fontWeight=500`;
}

/**
 * Static waveform bars - decorative representation
 */
function WaveformBars({ color }: { color: string }) {
  // Pre-defined bar heights for visual variety
  const barHeights = [8, 14, 10, 18, 12, 16, 8, 14, 10, 18, 12, 8];

  return (
    <View style={waveformStyles.container}>
      {barHeights.map((height, index) => (
        <View
          key={index}
          style={[
            waveformStyles.bar,
            {
              height,
              backgroundColor: color,
            },
          ]}
        />
      ))}
    </View>
  );
}

const waveformStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flex: 1,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    opacity: 0.6,
  },
});

export function AudioCard({
  senderName,
  date,
  description,
  tags,
  duration,
  isPlaying,
  isBuffering,
  onPlay,
  isTranscribing = false,
  isFromMe = false,
  importSource,
  importedAt,
  importedByName,
}: AudioCardProps) {
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const lilac = useThemeColor({}, "lilac");
  const dustyPink = useThemeColor({}, "dustyPink");

  // Different styling for "me" vs "others"
  const senderBadgeColor = isFromMe ? lilac : dustyPink;

  return (
    <SoftCard style={styles.container}>
      {/* Header: Avatar + Sender Badge + Date */}
      <View style={styles.header}>
        {/* Middle: Sender name badge + Date */}
        <View style={styles.senderRow}>
          <View
            style={[
              styles.senderBadge,
              { backgroundColor: `${senderBadgeColor}30` },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.senderText, { color: isFromMe ? lilac : text }]}
            >
              {isFromMe ? "Me" : senderName}
            </Text>
          </View>
          <Text style={[styles.dateText, { color: textSecondary }]}>
            {date}
          </Text>
        </View>
      </View>

      {/* Audio Row: Waveform + Duration + Play Button */}
      <View style={styles.audioRow}>
        {/* Left: Avatar */}
        <Image
          contentFit="cover"
          source={{ uri: getAvatarUrl(senderName) }}
          style={styles.avatar}
          transition={200}
        />

        <WaveformBars color={lilac} />

        {duration && (
          <Text style={[styles.durationText, { color: textSecondary }]}>
            {duration}
          </Text>
        )}

        <View onStartShouldSetResponder={() => true}>
          <PressableScale onPress={onPlay} style={styles.playButton}>
            {isBuffering ? (
              <ActivityIndicator color={lilac} size="small" />
            ) : (
              <Ionicons
                color={lilac}
                name={isPlaying ? "pause-circle" : "play-circle"}
                size={44}
              />
            )}
          </PressableScale>
        </View>
      </View>

      {/* Body: Transcript or Status */}
      <View style={styles.body}>
        {isTranscribing ? (
          <View style={styles.transcribingRow}>
            <Ionicons color={textSecondary} name="sync-outline" size={14} />
            <Text style={[styles.transcribingText, { color: textSecondary }]}>
              Transcribing...
            </Text>
          </View>
        ) : description ? (
          <Text
            numberOfLines={2}
            style={[styles.description, { color: textSecondary }]}
          >
            "{description}"
          </Text>
        ) : null}
      </View>

      {/* Footer: Tags & Import Info */}
      {(tags.length > 0 || importSource) && (
        <View style={styles.footer}>
          <View style={styles.tags}>
            {tags.map((tag) => (
              <View
                key={tag}
                style={[styles.tag, { backgroundColor: `${dustyPink}30` }]}
              >
                <Text style={[styles.tagText, { color: text }]}>{tag}</Text>
              </View>
            ))}
          </View>

          {importSource && importedAt && (
            <View style={styles.importBadge}>
              <Ionicons
                color={SOURCE_CONFIG[importSource].color}
                name={
                  SOURCE_CONFIG[importSource]
                    .icon as keyof typeof Ionicons.glyphMap
                }
                size={14}
              />
              <Text style={[styles.importText, { color: textSecondary }]}>
                Imported {formatImportedDate(importedAt)}
                {importedByName ? ` by ${importedByName}` : ""}
              </Text>
            </View>
          )}
        </View>
      )}
    </SoftCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  senderBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  senderText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 12,
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  durationText: {
    fontSize: 13,
    fontWeight: "500",
    minWidth: 36,
  },
  playButton: {
    // Icon handles sizing
  },
  body: {
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
  transcribingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  transcribingText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  footer: {
    flexDirection: "column",
    gap: 12,
    marginTop: 6,
  },
  tags: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "500",
  },
  importBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    paddingVertical: 2,
    opacity: 0.8,
  },
  importText: {
    fontSize: 11,
  },
});
