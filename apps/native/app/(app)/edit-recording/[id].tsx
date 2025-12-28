import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
	type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { HeaderButton } from "@react-navigation/elements";
import { useQuery } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SoftInput } from "@/components/ui/SoftInput";
import { Shadows } from "@/constants/theme";
import { useUpdateRecordingMutation } from "@/features/recordings";
import { useThemeColor } from "@/hooks/use-theme-color";
import { recordingQueryOptions } from "@/queries/recordings";

export default function EditRecordingScreen() {
	const { id } = useLocalSearchParams<{ id?: string | string[] }>();
	const recordingId = Array.isArray(id) ? id[0] : (id ?? "");

	const {
		data: recording,
		isLoading,
		error,
	} = useQuery(recordingQueryOptions(recordingId));

	const updateMutation = useUpdateRecordingMutation();

	// Theme colors
	const background = useThemeColor({}, "background");
	const surface = useThemeColor({}, "surface");
	const text = useThemeColor({}, "text");
	const textSecondary = useThemeColor({}, "textSecondary");
	const tint = useThemeColor({}, "tint");

	// Form state - initialized when recording loads
	const [recordedAt, setRecordedAt] = useState<Date | null>(null);
	const [keywordsText, setKeywordsText] = useState<string | null>(null);
	const [showDatePicker, setShowDatePicker] = useState(false);

	// Initialize form state when recording loads
	if (recording && recordedAt === null) {
		setRecordedAt(new Date(recording.recordedAt));
	}
	if (recording && keywordsText === null) {
		setKeywordsText(
			recording.keywords.map((k: { name: string }) => k.name).join(", "),
		);
	}

	const handleClose = () => {
		router.back();
	};

	const handleSave = () => {
		if (!recording || !recordedAt) return;

		// Parse keywords from comma-separated text
		const keywordsList = (keywordsText ?? "")
			.split(",")
			.map((k) => k.trim())
			.filter((k) => k.length > 0);

		updateMutation.mutate(
			{
				id: recording.id,
				recordedAt: recordedAt.toISOString(),
				keywords: keywordsList,
			},
			{
				onSuccess: () => {
					router.back();
				},
				onError: (err) => {
					Alert.alert(
						"Update Failed",
						err instanceof Error ? err.message : "Failed to update recording",
					);
				},
			},
		);
	};

	const formatDate = (date: Date) => {
		return date.toLocaleDateString("en-US", {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	};

	// Loading state
	if (isLoading) {
		return (
			<View style={[styles.container, { backgroundColor: background }]}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={tint} />
				</View>
			</View>
		);
	}

	// Error state
	if (error || !recording) {
		const message =
			error instanceof Error ? error.message : "Recording not found";
		return (
			<View style={[styles.container, { backgroundColor: background }]}>
				<View style={[styles.header, { backgroundColor: surface }]}>
					<TouchableOpacity onPress={handleClose} style={styles.headerButton}>
						<Text style={[styles.headerButtonText, { color: textSecondary }]}>
							Cancel
						</Text>
					</TouchableOpacity>
					<Text style={[styles.headerTitle, { color: text }]}>
						Edit Details
					</Text>
					<View style={styles.headerButton} />
				</View>
				<View style={styles.errorContainer}>
					<Text style={[styles.errorText, { color: textSecondary }]}>
						{message}
					</Text>
				</View>
			</View>
		);
	}

	return (
		<View style={[styles.container]}>
			<Stack.Screen
				options={{
					title: "Edit Details",
					headerTransparent: true,
					headerRight: () => (
						<HeaderButton
							onPress={handleSave}
							disabled={updateMutation.isPending}
						>
							<Text
								style={[
									styles.headerButtonText,
									{ color: tint, fontWeight: "600" },
								]}
							>
								{updateMutation.isPending ? "Saving..." : "Done"}
							</Text>
						</HeaderButton>
					),
					headerLeft: () => (
						<HeaderButton onPress={handleClose}>
							<Text style={[styles.headerButtonText, { color: textSecondary }]}>
								Cancel
							</Text>
						</HeaderButton>
					),
				}}
			/>

			<KeyboardAwareScrollView contentInsetAdjustmentBehavior="always">
				{/* Date Section */}
				<View style={styles.section}>
					<Text style={[styles.sectionLabel, { color: textSecondary }]}>
						DATE & TIME
					</Text>
					<TouchableOpacity
						onPress={() => setShowDatePicker(true)}
						activeOpacity={0.7}
					>
						<View style={[styles.dateInput, { backgroundColor: surface }]}>
							<Ionicons
								name="calendar-outline"
								size={20}
								color={textSecondary}
								style={styles.inputIcon}
							/>
							<Text style={[styles.dateText, { color: text }]}>
								{recordedAt ? formatDate(recordedAt) : "Select date"}
							</Text>
							<Ionicons name="chevron-down" size={20} color={textSecondary} />
						</View>
					</TouchableOpacity>

					{showDatePicker && recordedAt && (
						<View style={styles.datePickerContainer}>
							<DateTimePicker
								value={recordedAt}
								mode="datetime"
								display={Platform.OS === "ios" ? "spinner" : "default"}
								onChange={(_event: DateTimePickerEvent, date?: Date) => {
									if (Platform.OS !== "ios") {
										setShowDatePicker(false);
									}
									if (date) {
										setRecordedAt(date);
									}
								}}
								style={styles.datePicker}
							/>
							{Platform.OS === "ios" && (
								<TouchableOpacity
									style={[styles.closeDatePicker, { backgroundColor: tint }]}
									onPress={() => setShowDatePicker(false)}
								>
									<Text style={styles.closeDatePickerText}>Confirm Date</Text>
								</TouchableOpacity>
							)}
						</View>
					)}
				</View>

				{/* Keywords Section */}
				<View style={styles.section}>
					<Text style={[styles.sectionLabel, { color: textSecondary }]}>
						KEYWORDS
					</Text>
					<SoftInput
						value={keywordsText ?? ""}
						onChangeText={setKeywordsText}
						placeholder="Add keywords separated by commas..."
						multiline
						numberOfLines={4}
						containerStyle={styles.keywordsContainer}
						style={styles.keywordsInput}
						icon="pricetags-outline"
					/>
					<Text style={[styles.helperText, { color: textSecondary }]}>
						Keywords help you find this recording later.
					</Text>
				</View>
			</KeyboardAwareScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 24,
	},
	loadingContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	errorContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
	},
	errorText: {
		fontSize: 16,
		textAlign: "center",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "rgba(0,0,0,0.05)",
	},
	headerButton: {
		padding: 8,
		minWidth: 60,
	},
	headerButtonText: {
		fontSize: 16,
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: "600",
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		padding: 20,
		gap: 32,
	},
	section: {
		gap: 8,
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: "600",
		letterSpacing: 0.5,
		marginLeft: 4,
		marginBottom: 4,
		textTransform: "uppercase",
	},
	dateInput: {
		flexDirection: "row",
		alignItems: "center",
		padding: 16,
		borderRadius: 16,
		...Shadows.small,
	},
	inputIcon: {
		marginRight: 12,
	},
	dateText: {
		flex: 1,
		fontSize: 16,
	},
	keywordsContainer: {
		borderRadius: 16,
		alignItems: "flex-start",
		paddingVertical: 4,
	},
	keywordsInput: {
		minHeight: 100,
		textAlignVertical: "top",
		lineHeight: 24,
	},
	helperText: {
		fontSize: 13,
		marginLeft: 4,
		opacity: 0.8,
	},
	datePickerContainer: {
		marginTop: 12,
		alignItems: "center",
	},
	datePicker: {
		// iOS picker style
	},
	closeDatePicker: {
		marginTop: 8,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 20,
	},
	closeDatePickerText: {
		color: "white",
		fontWeight: "600",
		fontSize: 14,
	},
});
