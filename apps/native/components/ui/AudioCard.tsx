import { ReluneColors } from "@/constants/theme";
import { View, Text, StyleSheet } from "react-native";
import { SoftCard } from "./SoftCard";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "pressto";
import { LinearGradient } from "expo-linear-gradient";

export interface AudioCardProps {
	title: string;
	date: string;
	description: string;
	tags: string[];
	duration?: string;
	onPlay?: () => void;
}

export function AudioCard({
	title,
	date,
	description,
	tags,
	duration,
	onPlay,
}: AudioCardProps) {
	return (
		<SoftCard style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>{title}</Text>
				<View style={styles.metaContainer}>
					{duration && <Text style={styles.date}>{duration} • </Text>}
					<Text style={styles.date}>{date}</Text>
				</View>
			</View>

			<Text style={styles.description} numberOfLines={2}>
				{description}
			</Text>

			<View style={styles.footer}>
				<View style={styles.tags}>
					{tags.map((tag, index) => (
						<View key={index} style={styles.tag}>
							<Text style={styles.tagText}>{tag}</Text>
						</View>
					))}
				</View>

				<View style={styles.playerContainer}>
					<View style={styles.waveform}>
						{/* Simulated waveform bars */}
						{[...Array(12)].map((_, i) => (
							<View
								key={i}
								style={[
									styles.bar,
									{
										height: 10 + Math.random() * 15, // Random height for visualizer effect
										backgroundColor:
											i % 2 === 0
												? ReluneColors.lilac
												: ReluneColors.primaryPurple,
										opacity: 0.6 + Math.random() * 0.4,
									},
								]}
							/>
						))}
					</View>

					<PressableScale onPress={onPlay}>
						<LinearGradient
							colors={[ReluneColors.primaryPurple, ReluneColors.lilac]}
							style={styles.playButton}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
						>
							<Ionicons
								name="play"
								size={20}
								color={ReluneColors.surface}
								style={{ marginLeft: 2 }} // Center the play icon visually
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
		color: ReluneColors.text,
		fontFamily: "System",
	},
	date: {
		fontSize: 12,
		color: ReluneColors.textSecondary,
		fontFamily: "System",
	},
	description: {
		fontSize: 14,
		color: ReluneColors.text,
		marginBottom: 16,
		lineHeight: 20,
		fontFamily: "System",
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
		backgroundColor: ReluneColors.dustyPink + "40", // 40% opacity
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
		marginRight: 8,
		marginBottom: 4,
	},
	tagText: {
		fontSize: 12,
		color: ReluneColors.text,
		fontFamily: "System",
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
		// backgroundColor removed in favor of gradient
		justifyContent: "center",
		alignItems: "center",
		shadowColor: ReluneColors.primaryPurple,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 6,
		elevation: 4,
	},
});
