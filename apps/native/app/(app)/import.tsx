import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { ThemedText } from "@/components/themed-text";
import { SoftButton } from "@/components/ui/SoftButton";
import { useImportWhatsAppMutation } from "@/features/import";
import { useThemeColor } from "@/hooks/use-theme-color";

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
		if (result) {
			const hasErrors = result.failed.length > 0;
			const hasImports = result.imported > 0;
			const hasSkips = result.skipped > 0;

			// Decide main icon and color
			let iconName: keyof typeof Ionicons.glyphMap = "checkmark-circle";
			let iconColor = success;
			let titleText = "Import Complete";

			if (!hasImports && !hasSkips && hasErrors) {
				iconName = "alert-circle";
				iconColor = errorColor;
				titleText = "Import Failed";
			} else if (!hasImports && hasSkips && !hasErrors) {
				iconName = "information-circle";
				iconColor = tint;
				titleText = "No New Recordings";
			} else if (!hasImports && !hasSkips && !hasErrors) {
				iconName = "alert-circle";
				iconColor = textSecondary;
				titleText = "No Files Found";
			}

			return (
				<Animated.View
					entering={FadeIn}
					exiting={FadeOut}
					style={styles.contentContainer}
				>
					<View style={styles.iconContainer}>
						<Ionicons name={iconName} size={64} color={iconColor} />
					</View>

					<ThemedText type="subtitle" style={styles.title}>
						{titleText}
					</ThemedText>

					<View style={{ alignItems: "center", gap: 4 }}>
						{hasImports && (
							<ThemedText style={{ textAlign: "center", fontSize: 16 }}>
								{result.imported} recording{result.imported !== 1 ? "s" : ""}{" "}
								imported
							</ThemedText>
						)}
						{hasSkips && (
							<ThemedText style={{ color: textSecondary, textAlign: "center" }}>
								{result.skipped} duplicate{result.skipped !== 1 ? "s" : ""}{" "}
								skipped
							</ThemedText>
						)}
						{hasErrors && (
							<ThemedText style={{ color: errorColor, textAlign: "center" }}>
								{result.failed.length} failed
							</ThemedText>
						)}
						{!hasImports && !hasSkips && !hasErrors && (
							<ThemedText style={{ color: textSecondary, textAlign: "center" }}>
								No audio files found in export
							</ThemedText>
						)}
					</View>
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
						title={
							importMutation.isPending ? "Importing..." : "Select Export File"
						}
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
