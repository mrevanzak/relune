import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { SoftButton } from "@/components/ui/SoftButton";
import { SoftCard } from "@/components/ui/SoftCard";
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

  // Fetch all users for dropdown
  const usersQuery = useQuery(orpc.users.list.queryOptions());

  // Fetch saved mappings to pre-fill
  const mappingsQuery = useQuery(orpc.senderMappings.list.queryOptions());

  // Mapping state
  const [mappings, setMappings] = useState<SenderMappingState[]>([]);

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
                </ScrollView>
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
