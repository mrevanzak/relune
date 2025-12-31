import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { PressableScale } from "pressto";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { ThemedText } from "@/components/themed-text";
import { SoftButton } from "@/components/ui/SoftButton";
import { SoftCard } from "@/components/ui/SoftCard";
import { SoftInput } from "@/components/ui/SoftInput";
import { useThemeColor } from "@/hooks/use-theme-color";
import { orpc } from "@/lib/api";

type SenderMappingState = {
  externalName: string;
  mappedUserId: string | null;
  saveMapping: boolean;
};

export default function ImportMappingScreen() {
  const params = useLocalSearchParams<{
    senderNames?: string;
    fileBase64?: string;
  }>();

  // Parse sender names from params (comma-separated)
  const senderNames = useMemo(() => {
    if (!params.senderNames) return [];
    try {
      return JSON.parse(params.senderNames) as string[];
    } catch {
      return params.senderNames.split(",").map((s) => s.trim());
    }
  }, [params.senderNames]);

  // Theme colors
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const tint = useThemeColor({}, "tint");
  const surface = useThemeColor({}, "surface");
  const lilac = useThemeColor({}, "lilac");
  const errorColor = useThemeColor({}, "error");

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Fetch all users for dropdown
  const usersQuery = useQuery(orpc.users.list.queryOptions());

  // Fetch saved mappings to pre-fill
  const mappingsQuery = useQuery(orpc.senderMappings.list.queryOptions());

  // Mapping state
  const [mappings, setMappings] = useState<SenderMappingState[]>([]);

  // Inline create user form state
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserDisplayName, setNewUserDisplayName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Create user mutation
  const createUserMutation = useMutation(
    orpc.users.create.mutationOptions({
      onSuccess: async (newUser, _variables, _onMutateResult, context) => {
        // Invalidate users query so new user appears everywhere
        await context.client.invalidateQueries({
          queryKey: orpc.users.list.key(),
        });

        // Auto-select the newly created user for the current mapping
        if (expandedIndex !== null) {
          updateMapping(expandedIndex, { mappedUserId: newUser.id });
        }

        // Reset form state
        setExpandedIndex(null);
        setNewUserEmail("");
        setNewUserDisplayName("");
        setCreateError(null);
      },
      onError: (error) => {
        // Show error message
        const message =
          error instanceof Error ? error.message : "Failed to create user";
        setCreateError(message);
      },
    })
  );

  // Handle opening the create form for a specific mapping
  const openCreateForm = useCallback((index: number, senderName: string) => {
    setExpandedIndex(index);
    setNewUserEmail("");
    setNewUserDisplayName(senderName); // Pre-fill with sender name
    setCreateError(null);
  }, []);

  // Handle closing the create form
  const closeCreateForm = useCallback(() => {
    setExpandedIndex(null);
    setNewUserEmail("");
    setNewUserDisplayName("");
    setCreateError(null);
  }, []);

  // Handle creating a new user
  const handleCreateUser = useCallback(() => {
    if (!newUserEmail.trim()) {
      setCreateError("Email is required");
      return;
    }
    setCreateError(null);
    createUserMutation.mutate({
      email: newUserEmail.trim(),
      displayName: newUserDisplayName.trim() || undefined,
    });
  }, [newUserEmail, newUserDisplayName, createUserMutation]);

  // Initialize mappings when data is available
  useEffect(() => {
    if (senderNames.length === 0) return;

    const savedMappingsMap = new Map(
      mappingsQuery.data?.map((m) => [m.externalName, m.mappedUser.id]) ?? []
    );

    setMappings(
      senderNames.map((name) => ({
        externalName: name,
        mappedUserId: savedMappingsMap.get(name) ?? null,
        saveMapping: true,
      }))
    );
  }, [senderNames, mappingsQuery.data]);

  // Update a specific mapping
  const updateMapping = useCallback(
    (index: number, updates: Partial<SenderMappingState>) => {
      setMappings((prev) =>
        prev.map((m, i) => (i === index ? { ...m, ...updates } : m))
      );
    },
    []
  );

  // Check if all senders are mapped
  const allMapped = mappings.every((m) => m.mappedUserId !== null);

  // Handle continue - navigate back to import with mappings
  const handleContinue = useCallback(() => {
    // Build sender mappings object
    const senderMappingsObj: Record<string, string> = {};
    for (const m of mappings) {
      if (m.mappedUserId) {
        senderMappingsObj[m.externalName] = m.mappedUserId;
      }
    }

    // Check if any mappings should be saved
    const saveMappings = mappings.some((m) => m.saveMapping && m.mappedUserId);

    // Navigate back to import with the mappings
    router.replace({
      pathname: "/import",
      params: {
        senderMappings: JSON.stringify(senderMappingsObj),
        saveMappings: saveMappings ? "true" : "false",
        fileBase64: params.fileBase64,
      },
    });
  }, [mappings, params.fileBase64]);

  const users = usersQuery.data ?? [];
  const background = useThemeColor({}, "background");

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInset={{ top: 20, bottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Ionicons color={tint} name="people" size={48} />
          <ThemedText style={styles.title} type="subtitle">
            Map Sender Names
          </ThemedText>
          <Text style={[styles.description, { color: textSecondary }]}>
            We found {senderNames.length} sender
            {senderNames.length !== 1 ? "s" : ""} in this chat. Please map each
            name to a user account.
          </Text>
        </View>

        <View style={styles.mappingsList}>
          {mappings.map((mapping, index) => (
            <SoftCard key={mapping.externalName} style={styles.mappingCard}>
              <Text style={[styles.senderName, { color: text }]}>
                "{mapping.externalName}"
              </Text>

              <View style={styles.userSelect}>
                <Text style={[styles.label, { color: textSecondary }]}>
                  Map to:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.userPills}
                >
                  {users.map((user) => {
                    const isSelected = mapping.mappedUserId === user.id;
                    return (
                      <Pressable
                        key={user.id}
                        onPress={() =>
                          updateMapping(index, { mappedUserId: user.id })
                        }
                        style={[
                          styles.userPill,
                          {
                            backgroundColor: isSelected ? tint : surface,
                            borderColor: isSelected
                              ? tint
                              : `${textSecondary}40`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.userPillText,
                            { color: isSelected ? surface : text },
                          ]}
                        >
                          {user.displayName ?? user.email}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {/* Add new user pill */}
                  <PressableScale
                    onPress={() => openCreateForm(index, mapping.externalName)}
                    style={[
                      styles.userPill,
                      styles.addUserPill,
                      {
                        borderColor: `${textSecondary}40`,
                        borderStyle: "dashed",
                      },
                    ]}
                  >
                    <Ionicons
                      color={textSecondary}
                      name="add"
                      size={16}
                      style={styles.addIcon}
                    />
                    <Text
                      style={[styles.userPillText, { color: textSecondary }]}
                    >
                      Add new
                    </Text>
                  </PressableScale>
                </ScrollView>

                {/* Inline create user form */}
                {expandedIndex === index && (
                  <Animated.View
                    entering={FadeInUp.duration(200).springify()}
                    exiting={FadeOutUp.duration(150)}
                    style={styles.createForm}
                  >
                    <View style={styles.createFormHeader}>
                      <Text style={[styles.createFormTitle, { color: text }]}>
                        Create new user
                      </Text>
                      <Pressable
                        hitSlop={8}
                        onPress={closeCreateForm}
                        style={styles.closeButton}
                      >
                        <Ionicons
                          color={textSecondary}
                          name="close"
                          size={20}
                        />
                      </Pressable>
                    </View>

                    <SoftInput
                      autoCapitalize="none"
                      autoComplete="email"
                      autoFocus
                      icon="mail-outline"
                      keyboardType="email-address"
                      onChangeText={setNewUserEmail}
                      placeholder="Email address"
                      value={newUserEmail}
                    />

                    <SoftInput
                      icon="person-outline"
                      onChangeText={setNewUserDisplayName}
                      placeholder="Display name (optional)"
                      value={newUserDisplayName}
                    />

                    {createError && (
                      <Text style={[styles.errorText, { color: errorColor }]}>
                        {createError}
                      </Text>
                    )}

                    <SoftButton
                      disabled={
                        !newUserEmail.trim() || createUserMutation.isPending
                      }
                      loading={createUserMutation.isPending}
                      onPress={handleCreateUser}
                      title={
                        createUserMutation.isPending
                          ? "Creating..."
                          : "Create & Map"
                      }
                    />
                  </Animated.View>
                )}
              </View>

              <View style={styles.saveRow}>
                <Text style={[styles.saveLabel, { color: textSecondary }]}>
                  Remember this mapping
                </Text>
                <Switch
                  onValueChange={(value) =>
                    updateMapping(index, { saveMapping: value })
                  }
                  trackColor={{ false: `${textSecondary}40`, true: lilac }}
                  value={mapping.saveMapping}
                />
              </View>
            </SoftCard>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: background }]}>
        <SoftButton
          disabled={!allMapped}
          onPress={handleContinue}
          title={allMapped ? "Continue Import" : "Map All Senders to Continue"}
        />
        {!allMapped && (
          <Text style={[styles.footerHint, { color: textSecondary }]}>
            {mappings.filter((m) => m.mappedUserId === null).length} sender
            {mappings.filter((m) => m.mappedUserId === null).length !== 1
              ? "s"
              : ""}{" "}
            still need to be mapped
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    gap: 12,
  },
  title: {
    textAlign: "center",
    fontSize: 24,
  },
  description: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  mappingsList: {
    gap: 16,
  },
  mappingCard: {
    gap: 16,
  },
  senderName: {
    fontSize: 18,
    fontWeight: "600",
  },
  userSelect: {
    gap: 8,
  },
  label: {
    fontSize: 14,
  },
  userPills: {
    flexDirection: "row",
  },
  userPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  userPillText: {
    fontSize: 14,
    fontWeight: "500",
  },
  addUserPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  addIcon: {
    marginRight: 4,
  },
  createForm: {
    marginTop: 12,
    gap: 12,
  },
  createFormHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  createFormTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 13,
  },
  spinner: {
    marginTop: 4,
  },
  saveRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  saveLabel: {
    fontSize: 14,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  footerHint: {
    textAlign: "center",
    fontSize: 14,
  },
});
