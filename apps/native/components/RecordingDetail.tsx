import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { RecordingWithKeywords } from "server/src/modules/recordings/service";
import { AudioPlayer } from "@/components/ui/AudioPlayer";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { SoftCard } from "@/components/ui/SoftCard";
import { Shadows } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

function formatDateTime(date: Date | string): string {
	const d = new Date(date);
	return d.toLocaleString([], {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function formatDuration(seconds: number | null): string | null {
	if (seconds === null) return null;
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

function generateTitle(recordedAt: Date | string): string {
	const date = new Date(recordedAt);
	return `Recording — ${date.toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

export function RecordingDetail({
	recording,
}: {
	recording: RecordingWithKeywords;
}) {
	const text = useThemeColor({}, "text");
	const textSecondary = useThemeColor({}, "textSecondary");
	const surface = useThemeColor({}, "surface");
	const dustyPink = useThemeColor({}, "dustyPink");

	const title = useMemo(() => generateTitle(recording.recordedAt), [recording]);
	const meta = useMemo(() => {
		const date = formatDateTime(recording.recordedAt);
		const dur = formatDuration(recording.durationSeconds);
		return dur ? `${date} • ${dur}` : date;
	}, [recording]);

	return (
		<GradientBackground>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				contentInsetAdjustmentBehavior="automatic"
			>
				<View style={styles.header}>
					<Text style={[styles.title, { color: text }]}>{title}</Text>
					<Text style={[styles.meta, { color: textSecondary }]}>{meta}</Text>
				</View>

				<SoftCard style={styles.section}>
					<Text style={[styles.sectionTitle, { color: textSecondary }]}>
						KEYWORDS
					</Text>
					<View style={styles.keywordsRow}>
						{recording.keywords.length === 0 ? (
							<Text style={[styles.emptyText, { color: textSecondary }]}>
								No keywords yet
							</Text>
						) : (
							recording.keywords.map((kw) => (
								<View
									key={kw.id}
									style={[
										styles.keywordPill,
										{
											backgroundColor: surface,
											borderColor: `${dustyPink}40`,
										},
									]}
								>
									<Text style={[styles.keywordText, { color: text }]}>
										{kw.name}
									</Text>
								</View>
							))
						)}
					</View>
				</SoftCard>

				<SoftCard style={styles.section}>
					<Text style={[styles.sectionTitle, { color: textSecondary }]}>
						TRANSCRIPT
					</Text>
					{recording.transcript ? (
						<Text style={[styles.transcript, { color: text }]}>
							{recording.transcript}
						</Text>
					) : (
						<Text style={[styles.emptyText, { color: textSecondary }]}>
							Transcribing…
						</Text>
					)}
				</SoftCard>
			</ScrollView>

			<View style={[styles.footer, { backgroundColor: surface, bottom: 24 }]}>
				<AudioPlayer
					audioUrl={recording.audioUrl}
					durationSeconds={recording.durationSeconds}
				/>
			</View>
		</GradientBackground>
	);
}

const FOOTER_HEIGHT = 80;

const styles = StyleSheet.create({
	scrollContent: {
		paddingHorizontal: 20,
		gap: 24,
	},
	header: {
		gap: 8,
		marginBottom: 8,
	},
	title: {
		fontSize: 32,
		fontWeight: "800",
		letterSpacing: -0.5,
	},
	meta: {
		fontSize: 15,
		fontWeight: "500",
		opacity: 0.8,
	},
	section: {
		gap: 16,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: "700",
		letterSpacing: 1,
		opacity: 0.7,
	},
	keywordsRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
	},
	keywordPill: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 12,
		borderWidth: 1,
	},
	keywordText: {
		fontSize: 14,
		fontWeight: "600",
	},
	transcript: {
		fontSize: 16,
		lineHeight: 26,
	},
	emptyText: {
		fontSize: 15,
		fontStyle: "italic",
		opacity: 0.7,
	},
	footer: {
		position: "absolute",
		left: 20,
		right: 20,
		height: FOOTER_HEIGHT,
		borderRadius: 1000,
		justifyContent: "center",
		...Shadows.soft,
	},
});
