import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PressableScale } from "pressto";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gradients } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { SoftCard } from "./SoftCard";

export interface AudioCardProps {
	title: string;
	date: string;
	description: string;
	tags: string[];
	duration?: string;
	onPlay?: () => void;
}

// Pre-generate waveform data to avoid re-rendering issues
const WAVEFORM_BARS = Array.from({ length: 12 }, (_, i) => ({
	id: `bar-${i}`,
	height: 10 + ((i * 7) % 15),
	isEven: i % 2 === 0,
}));

export function AudioCard({
	title,
	date,
	description,
	tags,
	duration,
	onPlay,
}: AudioCardProps) {
	const text = useThemeColor({}, "text");
	const textSecondary = useThemeColor({}, "textSecondary");
	const surface = useThemeColor({}, "surface");
	const lilac = useThemeColor({}, "lilac");
	const tint = useThemeColor({}, "tint");
	const dustyPink = useThemeColor({}, "dustyPink");

	// Memoize waveform to prevent re-renders
	const waveformBars = useMemo(() => WAVEFORM_BARS, []);

	return (
		<SoftCard style={styles.container}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: text }]}>{title}</Text>
				<View style={styles.metaContainer}>
					{duration && (
						<Text style={[styles.date, { color: textSecondary }]}>
							{duration} •{" "}
						</Text>
					)}
					<Text style={[styles.date, { color: textSecondary }]}>{date}</Text>
				</View>
			</View>

			<Text style={[styles.description, { color: text }]} numberOfLines={2}>
				{description}
			</Text>

			<View style={styles.footer}>
				<View style={styles.tags}>
					{tags.map((tag) => (
						<View
							key={tag}
							style={[styles.tag, { backgroundColor: `${dustyPink}40` }]}
						>
							<Text style={[styles.tagText, { color: text }]}>{tag}</Text>
						</View>
					))}
				</View>

				<View style={styles.playerContainer}>
					<View style={styles.waveform}>
						{waveformBars.map((bar) => (
							<View
								key={bar.id}
								style={[
									styles.bar,
									{
										height: bar.height,
										backgroundColor: bar.isEven ? lilac : tint,
									},
								]}
							/>
						))}
					</View>

					<PressableScale onPress={onPlay}>
						<LinearGradient
							colors={Gradients.primary}
							style={[styles.playButton, { shadowColor: tint }]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
						>
							<Ionicons
								name="play"
								size={20}
								color={surface}
								style={styles.playIcon}
							/>
						</LinearGradient>
					</PressableScale>
				</View>
			</View>
		</SoftCard>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "baseline",
		marginBottom: 8,
	},
	metaContainer: {
		flexDirection: "row",
	},
	title: {
		fontSize: 18,
		fontWeight: "600",
	},
	date: {
		fontSize: 12,
	},
	description: {
		fontSize: 14,
		marginBottom: 16,
		lineHeight: 20,
	},
	footer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	tags: {
		flexDirection: "row",
		flexWrap: "wrap",
		flex: 1,
		marginRight: 12,
	},
	tag: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
		marginRight: 8,
		marginBottom: 4,
	},
	tagText: {
		fontSize: 12,
	},
	playerContainer: {
		flexDirection: "row",
		alignItems: "center",
	},
	waveform: {
		flexDirection: "row",
		alignItems: "center",
		marginRight: 12,
		height: 30,
	},
	bar: {
		width: 3,
		marginHorizontal: 1,
		borderRadius: 2,
	},
	playButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 6,
		elevation: 4,
	},
	playIcon: {
		marginLeft: 2,
	},
});
