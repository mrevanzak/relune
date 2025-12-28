import { HeaderButton } from "@react-navigation/elements";
import { useQuery } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { RecordingDetail } from "@/components/RecordingDetail";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useDeleteRecordingMutation } from "@/features/recordings";
import { useThemeColor } from "@/hooks/use-theme-color";
import { recordingQueryOptions } from "@/queries/recordings";

function LoadingState() {
  const tint = useThemeColor({}, "tint");

  return (
    <View style={styles.stateContainer}>
      <ActivityIndicator color={tint} size="large" />
    </View>
  );
}

function ErrorState({ message }: { message: string }) {
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");

  return (
    <View style={[styles.stateContainer]}>
      <Text style={[styles.errorTitle, { color: text }]}>Couldn’t load</Text>
      <Text style={[styles.errorMessage, { color: textSecondary }]}>
        {message}
      </Text>
    </View>
  );
}

export default function RecordingDetailScreen() {
  const tint = useThemeColor({}, "tint");

  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const recordingId = Array.isArray(id) ? id[0] : (id ?? "");

  const deleteMutation = useDeleteRecordingMutation();

  const {
    data: recording,
    isLoading,
    error,
  } = useQuery(recordingQueryOptions(recordingId));

  if (!recordingId) {
    return <ErrorState message="Missing recording id." />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !recording) {
    const message =
      error instanceof Error ? error.message : "Recording not found";
    return <ErrorState message={message} />;
  }

  const handleDelete = () => {
    Alert.alert("Delete Recording", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteMutation.mutate(recording.id, {
            onSuccess: () => {
              router.back();
            },
            onError: (err) => {
              const message =
                err instanceof Error
                  ? err.message
                  : "Failed to delete recording";
              Alert.alert("Delete failed", message);
            },
          });
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerButtons}>
              <HeaderButton
                onPress={() => {
                  router.push(`/edit-recording/${recording.id}`);
                }}
              >
                <IconSymbol color={tint} name="pencil" size={24} />
              </HeaderButton>
              <HeaderButton
                onPress={() => {
                  if (deleteMutation.isPending) return;
                  handleDelete();
                }}
              >
                <IconSymbol color={tint} name="trash" size={24} />
              </HeaderButton>
            </View>
          ),
        }}
      />

      <RecordingDetail recording={recording} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  errorMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
