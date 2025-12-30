import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SoftCard } from "@/components/ui/SoftCard";
import {
  useDeleteSenderMappingMutation,
  useSenderMappings,
  useSettings,
  useUpdateSettingsMutation,
} from "@/features/settings";
import { useThemeColor } from "@/hooks/use-theme-color";

const AUTO_ARCHIVE_OPTIONS = [
  { label: "Off (manual only)", value: null },
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
];

export default function SettingsScreen() {
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tint = useThemeColor({}, "tint");
  const lilac = useThemeColor({}, "lilac");
  const errorColor = useThemeColor({}, "error");

  const settingsQuery = useSettings();
  const mappingsQuery = useSenderMappings();
  const updateSettingsMutation = useUpdateSettingsMutation();
  const deleteMappingMutation = useDeleteSenderMappingMutation();

  const currentAutoArchiveDays = settingsQuery.data?.autoArchiveDays ?? null;

  const handleAutoArchiveChange = useCallback(
    (value: number | null) => {
      updateSettingsMutation.mutate({ autoArchiveDays: value });
    },
    [updateSettingsMutation]
  );

  const handleDeleteMapping = useCallback(
    (id: string, externalName: string) => {
      Alert.alert(
        "Delete Mapping",
        `Remove the mapping for "${externalName}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteMappingMutation.mutate({ id }),
          },
        ]
      );
    },
    [deleteMappingMutation]
  );

  const isLoading = settingsQuery.isLoading || mappingsQuery.isLoading;
  const mappings = mappingsQuery.data ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="always"
      style={styles.container}
    >
      {/* Auto-Archive Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: text }]}>AUTO-ARCHIVE</Text>
        <Text style={[styles.sectionDescription, { color: textSecondary }]}>
          Automatically move recordings to Archived after a set number of days.
        </Text>

        <SoftCard style={styles.optionsCard}>
          {AUTO_ARCHIVE_OPTIONS.map((option, index) => {
            const isSelected = currentAutoArchiveDays === option.value;
            const isLast = index === AUTO_ARCHIVE_OPTIONS.length - 1;

            return (
              <Pressable
                key={option.label}
                onPress={() => handleAutoArchiveChange(option.value)}
                style={[
                  styles.optionRow,
                  !isLast && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: `${textSecondary}30`,
                  },
                ]}
              >
                <Text style={[styles.optionLabel, { color: text }]}>
                  {option.label}
                </Text>
                {isSelected && (
                  <Ionicons color={tint} name="checkmark" size={24} />
                )}
              </Pressable>
            );
          })}
        </SoftCard>
      </View>

      {/* Saved Mappings Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: text }]}>
          SAVED MAPPINGS
        </Text>
        <Text style={[styles.sectionDescription, { color: textSecondary }]}>
          Remembered sender name mappings for WhatsApp imports.
        </Text>

        {mappings.length === 0 ? (
          <View style={styles.emptyMappings}>
            <Ionicons color={lilac} name="people-outline" size={32} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>
              No saved mappings yet
            </Text>
          </View>
        ) : (
          <SoftCard style={styles.mappingsCard}>
            {mappings.map((mapping, index) => {
              const isLast = index === mappings.length - 1;

              return (
                <View
                  key={mapping.id}
                  style={[
                    styles.mappingRow,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: `${textSecondary}30`,
                    },
                  ]}
                >
                  <View style={styles.mappingInfo}>
                    <Text style={[styles.externalName, { color: text }]}>
                      "{mapping.externalName}"
                    </Text>
                    <Text style={[styles.mappedTo, { color: textSecondary }]}>
                      →{" "}
                      {mapping.mappedUser.displayName ??
                        mapping.mappedUser.email}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      handleDeleteMapping(mapping.id, mapping.externalName)
                    }
                    style={styles.deleteButton}
                  >
                    <Ionicons
                      color={errorColor}
                      name="close-circle"
                      size={24}
                    />
                  </Pressable>
                </View>
              );
            })}
          </SoftCard>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  optionsCard: {
    padding: 0,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionLabel: {
    fontSize: 16,
  },
  mappingsCard: {
    padding: 0,
  },
  mappingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  mappingInfo: {
    flex: 1,
    gap: 2,
  },
  externalName: {
    fontSize: 16,
    fontWeight: "500",
  },
  mappedTo: {
    fontSize: 14,
  },
  deleteButton: {
    padding: 4,
  },
  emptyMappings: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
});
