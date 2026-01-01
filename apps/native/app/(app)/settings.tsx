import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import { PressableOpacity, PressableScale } from "pressto";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SoftCard } from "@/components/ui/SoftCard";
import { SoftInput } from "@/components/ui/SoftInput";
import { useSession } from "@/context/session";
import { useCurrentUser, useUpdateDisplayNameMutation } from "@/features/auth";
import {
  useCheckForUpdates,
  useDeleteSenderMappingMutation,
  useSenderMappings,
  useSettings,
  useUpdateSettingsMutation,
} from "@/features/settings";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
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
  const reducedMotion = useReducedMotion();

  // Profile state
  const { signOut } = useSession();
  const userQuery = useCurrentUser();
  const updateDisplayNameMutation = useUpdateDisplayNameMutation();
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  // Animation for edit mode transition
  const editProgress = useSharedValue(0);

  useEffect(() => {
    editProgress.value = withTiming(isEditingName ? 1 : 0, {
      duration: reducedMotion ? 0 : 200,
    });
  }, [isEditingName, reducedMotion, editProgress]);

  const editAnimatedStyle = useAnimatedStyle(() => ({
    opacity: editProgress.value,
    transform: [{ scale: 0.95 + editProgress.value * 0.05 }],
  }));

  const displayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - editProgress.value,
    transform: [{ scale: 1 - editProgress.value * 0.05 }],
  }));

  const settingsQuery = useSettings();
  const mappingsQuery = useSenderMappings();
  const updateSettingsMutation = useUpdateSettingsMutation();
  const deleteMappingMutation = useDeleteSenderMappingMutation();
  const { checkForUpdate, isChecking } = useCheckForUpdates();

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

  const handleStartEditName = useCallback(() => {
    setDisplayNameInput(userQuery.data?.displayName ?? "");
    setIsEditingName(true);
  }, [userQuery.data?.displayName]);

  const handleSaveDisplayName = useCallback(() => {
    const trimmed = displayNameInput.trim();
    updateDisplayNameMutation.mutate(
      { displayName: trimmed },
      {
        onSuccess: () => {
          setIsEditingName(false);
        },
      }
    );
  }, [displayNameInput, updateDisplayNameMutation]);

  const handleCancelEditName = useCallback(() => {
    setIsEditingName(false);
    setDisplayNameInput("");
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  }, [signOut]);

  const mappings = mappingsQuery.data ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="always"
      style={styles.container}
    >
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: text }]}>PROFILE</Text>
        <SoftCard style={styles.profileCard}>
          {/* Display Name Row */}
          <View style={styles.profileRow}>
            <Text style={[styles.profileLabel, { color: textSecondary }]}>
              Display Name
            </Text>
            <View>
              {/* Display mode - shows when not editing */}
              <Animated.View
                pointerEvents={isEditingName ? "none" : "auto"}
                style={[
                  displayAnimatedStyle,
                  isEditingName && styles.hiddenAbsolute,
                ]}
              >
                <PressableOpacity
                  onPress={handleStartEditName}
                  style={styles.profileValueRow}
                >
                  <Text style={[styles.profileValue, { color: text }]}>
                    {userQuery.data?.displayName || "Not set"}
                  </Text>
                  <Ionicons color={textSecondary} name="pencil" size={18} />
                </PressableOpacity>
              </Animated.View>

              {/* Edit mode - shows when editing */}
              {isEditingName && (
                <Animated.View
                  style={[styles.editNameContainer, editAnimatedStyle]}
                >
                  <SoftInput
                    autoFocus
                    containerStyle={styles.nameInput}
                    onChangeText={setDisplayNameInput}
                    onSubmitEditing={handleSaveDisplayName}
                    placeholder="Enter display name"
                    returnKeyType="done"
                    value={displayNameInput}
                  />
                  <View style={styles.editNameButtons}>
                    <Pressable
                      disabled={updateDisplayNameMutation.isPending}
                      onPress={handleCancelEditName}
                      style={styles.editButton}
                    >
                      <Ionicons color={textSecondary} name="close" size={22} />
                    </Pressable>
                    <Pressable
                      disabled={updateDisplayNameMutation.isPending}
                      onPress={handleSaveDisplayName}
                      style={styles.editButton}
                    >
                      {updateDisplayNameMutation.isPending ? (
                        <ActivityIndicator color={tint} size="small" />
                      ) : (
                        <Ionicons color={tint} name="checkmark" size={22} />
                      )}
                    </Pressable>
                  </View>
                </Animated.View>
              )}
            </View>
          </View>

          {/* Email Row */}
          <View
            style={[
              styles.profileRow,
              {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: `${textSecondary}30`,
              },
            ]}
          >
            <Text style={[styles.profileLabel, { color: textSecondary }]}>
              Email
            </Text>
            <Text style={[styles.profileValue, { color: text }]}>
              {userQuery.data?.email ?? "..."}
            </Text>
          </View>
        </SoftCard>
      </View>

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
              <PressableOpacity
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
                {isSelected &&
                  (reducedMotion ? (
                    <Ionicons color={tint} name="checkmark" size={20} />
                  ) : (
                    <Animated.View
                      entering={FadeIn.duration(150).withInitialValues({
                        opacity: 0,
                        transform: [{ scale: 0.8 }],
                      })}
                    >
                      <Ionicons color={tint} name="checkmark" size={20} />
                    </Animated.View>
                  ))}
              </PressableOpacity>
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
                  <PressableScale
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
                  </PressableScale>
                </View>
              );
            })}
          </SoftCard>
        )}
      </View>

      {/* Sign Out */}
      <PressableOpacity onPress={handleSignOut} style={styles.signOutButton}>
        <Ionicons color={errorColor} name="log-out-outline" size={20} />
        <Text style={[styles.signOutText, { color: errorColor }]}>
          Sign Out
        </Text>
      </PressableOpacity>

      {/* Version / Check for Updates */}
      <PressableOpacity
        onPress={isChecking ? undefined : checkForUpdate}
        style={[styles.versionContainer, isChecking && styles.disabled]}
      >
        {isChecking ? (
          <ActivityIndicator color={textSecondary} size="small" />
        ) : (
          <Text style={[styles.versionText, { color: textSecondary }]}>
            v{Application.nativeApplicationVersion} (
            {Application.nativeBuildVersion})
          </Text>
        )}
      </PressableOpacity>
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
  // Profile section styles
  profileCard: {
    padding: 0,
  },
  profileRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  profileLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 16,
  },
  profileValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editNameContainer: {
    gap: 12,
  },
  hiddenAbsolute: {
    position: "absolute",
    opacity: 0,
  },
  nameInput: {
    marginTop: 4,
  },
  editNameButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  editButton: {
    padding: 8,
  },
  // Auto-archive styles
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
  // Mappings styles
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
  // Sign out button
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "500",
  },
  // Version
  versionContainer: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  versionText: {
    fontSize: 13,
  },
  disabled: {
    opacity: 0.5,
  },
});
