import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { ThemedText } from "@/components/themed-text";
import { SoftButton } from "@/components/ui/SoftButton";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useImportWhatsAppMutation } from "@/queries/import";

export default function ImportScreen() {
	const importMutation = useImportWhatsAppMutation();

	const textSecondary = useThemeColor({}, "textSecondary");
	const tint = useThemeColor({}, "tint");
	const success = useThemeColor({}, "success");
	const errorColor = useThemeColor({}, "error");

	const result = importMutation.data;
	const error = importMutation.error;
	const isCancelled = error?.message === "CANCELLED";

	const handleImport = () => {
		importMutation.mutate();
	};

	const handleDone = () => {
		importMutation.reset();
		router.back();
	};

	const renderContent = () => {
		if (importMutation.isPending) {
			return (
				<Animated.View
					entering={FadeIn}
					exiting={FadeOut}
					style={styles.contentContainer}
				>
					<ActivityIndicator size="large" color={tint} />
					<ThemedText style={{ color: textSecondary }}>Importing...</ThemedText>
				</Animated.View>
			);
		}

		if (result) {
			return (
				<Animated.View
					entering={FadeIn}
					exiting={FadeOut}
					style={styles.resultsContainer}
				>
					{result.imported > 0 && (
						<View style={styles.resultRow}>
							<Ionicons name="checkmark-circle" size={24} color={success} />
							<ThemedText>
								{result.imported} recording{result.imported !== 1 ? "s" : ""}{" "}
								imported
							</ThemedText>
						</View>
					)}
					{result.skipped > 0 && (
						<View style={styles.resultRow}>
							<Ionicons name="remove-circle" size={24} color={textSecondary} />
							<ThemedText style={{ color: textSecondary }}>
								{result.skipped} duplicate{result.skipped !== 1 ? "s" : ""}{" "}
								skipped
							</ThemedText>
						</View>
					)}
					{result.failed.length > 0 && (
						<View style={styles.resultRow}>
							<Ionicons name="close-circle" size={24} color={errorColor} />
							<ThemedText style={{ color: errorColor }}>
								{result.failed.length} failed
							</ThemedText>
						</View>
					)}
					{result.imported === 0 &&
						result.skipped === 0 &&
						result.failed.length === 0 && (
							<ThemedText style={{ color: textSecondary, textAlign: "center" }}>
								No audio files found in export
							</ThemedText>
						)}
				</Animated.View>
			);
		}

		if (error && !isCancelled) {
			return (
				<Animated.View
					entering={FadeIn}
					exiting={FadeOut}
					style={styles.contentContainer}
				>
					<Ionicons name="alert-circle" size={48} color={errorColor} />
					<ThemedText style={{ color: errorColor, textAlign: "center" }}>
						{error.message}
					</ThemedText>
				</Animated.View>
			);
		}

		// Initial State
		return (
			<Animated.View
				entering={FadeIn}
				exiting={FadeOut}
				style={styles.contentContainer}
			>
				<View style={styles.iconContainer}>
					<Ionicons name="logo-whatsapp" size={64} color={tint} />
				</View>
				<ThemedText type="subtitle" style={styles.title}>
					Import from WhatsApp
				</ThemedText>
				<ThemedText style={[styles.instructions, { color: textSecondary }]}>
					Select a WhatsApp chat export (.zip) to import your voice notes into
					Relune.
				</ThemedText>
			</Animated.View>
		);
	};

	return (
		<View style={[styles.container]}>
			<View style={styles.contentWrapper}>{renderContent()}</View>

			<View style={styles.footer}>
				{result ? (
					<SoftButton title="Done" onPress={handleDone} />
				) : (
					<SoftButton
						title="Select Export File"
						onPress={handleImport}
						loading={importMutation.isPending}
						disabled={importMutation.isPending}
					/>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 32,
	},
	contentWrapper: {
		marginBottom: 32,
		minHeight: 180, // Prevent layout jumps
		justifyContent: "center",
	},
	contentContainer: {
		alignItems: "center",
		gap: 16,
	},
	resultsContainer: {
		gap: 16,
		paddingVertical: 12,
	},
	resultRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	iconContainer: {
		marginBottom: 8,
	},
	title: {
		textAlign: "center",
		fontSize: 24,
		marginBottom: 8,
	},
	instructions: {
		textAlign: "center",
		lineHeight: 24,
		fontSize: 16,
	},
	footer: {},
});
