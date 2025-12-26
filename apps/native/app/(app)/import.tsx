import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SoftButton } from "@/components/ui/SoftButton";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useImportWhatsAppMutation } from "@/queries/import";

export default function ImportScreen() {
	const importMutation = useImportWhatsAppMutation();

	const text = useThemeColor({}, "text");
	const textSecondary = useThemeColor({}, "textSecondary");
	const tint = useThemeColor({}, "tint");
	const success = useThemeColor({}, "success");
	const errorColor = useThemeColor({}, "error");
	const background = useThemeColor({}, "background");

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

	return (
		<View style={[styles.container, { backgroundColor: background }]}>
			<View style={styles.body}>
				{importMutation.isPending ? (
					// Loading State
					<View style={styles.centerContainer}>
						<ActivityIndicator size="large" color={tint} />
						<Text style={[styles.statusText, { color: textSecondary }]}>
							Importing...
						</Text>
					</View>
				) : result ? (
					// Results State
					<View style={styles.results}>
						{result.imported > 0 && (
							<View style={styles.resultRow}>
								<Ionicons name="checkmark-circle" size={20} color={success} />
								<Text style={[styles.resultText, { color: text }]}>
									{result.imported} recording
									{result.imported !== 1 ? "s" : ""} imported
								</Text>
							</View>
						)}
						{result.skipped > 0 && (
							<View style={styles.resultRow}>
								<Ionicons
									name="remove-circle"
									size={20}
									color={textSecondary}
								/>
								<Text style={[styles.resultText, { color: textSecondary }]}>
									{result.skipped} duplicate
									{result.skipped !== 1 ? "s" : ""} skipped
								</Text>
							</View>
						)}
						{result.failed.length > 0 && (
							<View style={styles.resultRow}>
								<Ionicons name="close-circle" size={20} color={errorColor} />
								<Text style={[styles.resultText, { color: errorColor }]}>
									{result.failed.length} failed
								</Text>
							</View>
						)}
						{result.imported === 0 &&
							result.skipped === 0 &&
							result.failed.length === 0 && (
								<Text style={[styles.resultText, { color: textSecondary }]}>
									No audio files found in export
								</Text>
							)}
					</View>
				) : error && !isCancelled ? (
					// Error State
					<View style={styles.centerContainer}>
						<Ionicons name="alert-circle" size={32} color={errorColor} />
						<Text style={[styles.errorText, { color: errorColor }]}>
							{error.message}
						</Text>
					</View>
				) : (
					// Initial State
					<View style={styles.centerContainer}>
						<Ionicons name="logo-whatsapp" size={48} color={tint} />
						<Text style={[styles.instructions, { color: textSecondary }]}>
							Select a WhatsApp chat export (.zip) to import voice notes
						</Text>
					</View>
				)}
			</View>

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
		flex: 1,
	},
	body: {
		flex: 1,
		justifyContent: "center",
		padding: 24,
	},
	centerContainer: {
		alignItems: "center",
		gap: 16,
	},
	statusText: {
		fontSize: 16,
	},
	results: {
		gap: 12,
	},
	resultRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	resultText: {
		fontSize: 15,
	},
	errorText: {
		fontSize: 15,
		textAlign: "center",
	},
	instructions: {
		fontSize: 15,
		textAlign: "center",
		lineHeight: 22,
	},
	footer: {
		padding: 24,
		paddingBottom: 40,
	},
});
