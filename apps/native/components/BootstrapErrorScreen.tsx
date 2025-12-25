import { Pressable, StyleSheet, Text, View } from "react-native";

interface BootstrapErrorScreenProps {
	error: Error;
	onRetry: () => void;
}

export function BootstrapErrorScreen({
	error,
	onRetry,
}: BootstrapErrorScreenProps) {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Something went wrong</Text>
			<Text style={styles.message}>{error.message}</Text>
			<Pressable style={styles.button} onPress={onRetry}>
				<Text style={styles.buttonText}>Try Again</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
		backgroundColor: "#fff",
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 12,
		color: "#333",
	},
	message: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
		marginBottom: 24,
		paddingHorizontal: 20,
	},
	button: {
		backgroundColor: "#007AFF",
		borderRadius: 8,
		paddingVertical: 14,
		paddingHorizontal: 32,
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
});
