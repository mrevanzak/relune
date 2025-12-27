import DateTimePicker, {
	type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
	Alert,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import type { RecordingWithKeywords } from "server/src/modules/recordings/service";
import { Shadows } from "@/constants/theme";
import { useUpdateRecordingMutation } from "@/features/recordings";
import { useThemeColor } from "@/hooks/use-theme-color";
import { SoftButton } from "./ui/SoftButton";
import { SoftInput } from "./ui/SoftInput";

interface EditRecordingModalProps {
	recording: RecordingWithKeywords;
	visible: boolean;
	onClose: () => void;
}

export function EditRecordingModal({
	recording,
	visible,
	onClose,
}: EditRecordingModalProps) {
	const updateMutation = useUpdateRecordingMutation();

	// Theme colors
	const background = useThemeColor({}, "background");
	const surface = useThemeColor({}, "surface");
	const text = useThemeColor({}, "text");
	const textSecondary = useThemeColor({}, "textSecondary");

	// Form state
	const [recordedAt, setRecordedAt] = useState(new Date(recording.recordedAt));
	const [keywordsText, setKeywordsText] = useState(
		recording.keywords.map((k) => k.name).join(", "),
	);
	const [showDatePicker, setShowDatePicker] = useState(false);

	const handleSave = () => {
		// Parse keywords from comma-separated text
		const keywordsList = keywordsText
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
					onClose();
				},
				onError: (error) => {
					Alert.alert(
						"Update Failed",
						error instanceof Error
							? error.message
							: "Failed to update recording",
					);
				},
			},
		);
	};

	const formatDate = (date: Date) => {
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="formSheet"
			onRequestClose={onClose}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={[styles.container, { backgroundColor: background }]}
			>
				{/* Header */}
				<View style={[styles.header, { backgroundColor: surface }]}>
					<SoftButton
						title="Cancel"
						variant="ghost"
						onPress={onClose}
						style={styles.headerButton}
					/>
					<Text style={[styles.headerTitle, { color: text }]}>
						Edit Recording
					</Text>
					<SoftButton
						title="Save"
						variant="ghost"
						onPress={handleSave}
						loading={updateMutation.isPending}
						style={styles.headerButton}
					/>
				</View>

				<ScrollView
					style={styles.content}
					contentContainerStyle={styles.contentContainer}
					keyboardShouldPersistTaps="handled"
				>
					{/* Date/Time Section */}
					<View style={styles.section}>
						<Text style={[styles.sectionLabel, { color: textSecondary }]}>
							Recorded At
						</Text>
						<View
							style={[
								styles.dateButton,
								{ backgroundColor: surface },
								Shadows.small,
							]}
						>
							<SoftButton
								title={formatDate(recordedAt)}
								variant="secondary"
								onPress={() => setShowDatePicker(true)}
								style={styles.dateButtonInner}
							/>
						</View>
						{showDatePicker && (
							<DateTimePicker
								value={recordedAt}
								mode="datetime"
								display={Platform.OS === "ios" ? "spinner" : "default"}
								onChange={(_event: DateTimePickerEvent, date?: Date) => {
									setShowDatePicker(Platform.OS === "ios");
									if (date) {
										setRecordedAt(date);
									}
								}}
							/>
						)}
					</View>

					{/* Keywords Section */}
					<View style={styles.section}>
						<Text style={[styles.sectionLabel, { color: textSecondary }]}>
							Keywords
						</Text>
						<Text style={[styles.sectionHint, { color: textSecondary }]}>
							Separate multiple keywords with commas
						</Text>
						<SoftInput
							value={keywordsText}
							onChangeText={setKeywordsText}
							placeholder="meeting, notes, project"
							multiline
							style={styles.keywordsInput}
						/>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 8,
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#EFEFEF",
	},
	headerButton: {
		minWidth: 70,
		paddingVertical: 8,
		paddingHorizontal: 12,
		shadowOpacity: 0,
		elevation: 0,
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: "600",
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		padding: 24,
		gap: 24,
	},
	section: {
		gap: 8,
	},
	sectionLabel: {
		fontSize: 14,
		fontWeight: "500",
		marginLeft: 4,
	},
	sectionHint: {
		fontSize: 12,
		marginLeft: 4,
		marginTop: -4,
	},
	dateButton: {
		borderRadius: 20,
		overflow: "hidden",
	},
	dateButtonInner: {
		shadowOpacity: 0,
		elevation: 0,
	},
	keywordsInput: {
		minHeight: 80,
		textAlignVertical: "top",
		paddingTop: 12,
	},
});
