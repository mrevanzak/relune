import * as FileSystem from "expo-file-system";
import { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { Tabs } from "@/components/NativeBottomTabs.native";
import { RecordingAccessoryView } from "@/components/RecordingAccessoryView";
import { Colors } from "@/constants/theme";
import { useUploadRecordingMutation } from "@/features/upload";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { isNetworkError } from "@/lib/api";
import { recordingUIStore } from "@/stores/recording-ui";
import { uploadQueueStore } from "@/stores/upload-queue";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { isRecording, start, stop, durationMs } = useAudioRecorder();
  const durationMsRef = useRef(durationMs);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // Keep latest duration for interval callback without recreating the interval.
  durationMsRef.current = durationMs;

  // TanStack Query mutation for uploads
  const mutation = useUploadRecordingMutation();
  const addToQueue = uploadQueueStore.use.addToQueue();

  // Recording UI store
  const isRecordingUI = recordingUIStore.use.isRecording();
  const uiDurationMs = recordingUIStore.use.durationMs();
  const startRecordingUI = recordingUIStore.use.startRecording();
  const updateDurationUI = recordingUIStore.use.updateDuration();
  const stopRecordingUI = recordingUIStore.use.stopRecording();
  const resetUI = recordingUIStore.use.reset();

  // Update duration in store while recording
  useEffect(() => {
    if (!isRecording) return;

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    durationIntervalRef.current = setInterval(() => {
      updateDurationUI(durationMsRef.current);
    }, 100);

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, [isRecording, updateDurationUI]);

  const handleRecordPress = useCallback(async () => {
    if (isRecording) {
      const result = await stop();
      if (result) {
        // Transition to uploading state
        stopRecordingUI();

        const params = {
          uri: result.uri,
          durationSeconds: result.durationSeconds,
          recordedAt: new Date(),
        };

        // Trigger upload mutation
        mutation.mutate(params, {
          onError: (error) => {
            // Queue for later if network error
            if (isNetworkError(error)) {
              addToQueue({
                uri: params.uri,
                durationSeconds: params.durationSeconds,
                recordedAt: params.recordedAt,
              });
            }
          },
        });
      }
    } else {
      startRecordingUI();
      await start();
    }
  }, [
    isRecording,
    start,
    stop,
    startRecordingUI,
    stopRecordingUI,
    mutation,
    addToQueue,
  ]);

  // Handle discard during recording
  const handleDiscardRecording = useCallback(async () => {
    const result = await stop();
    if (result?.uri) {
      try {
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
      } catch {
        // Ignore deletion errors
      }
    }
    resetUI();
  }, [stop, resetUI]);

  // Show accessory view when recording or mutation is active
  const showAccessoryView =
    isRecordingUI ||
    mutation.isPending ||
    mutation.isSuccess ||
    mutation.isError;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        hapticFeedbackEnabled
        initialRouteName="home"
        tabBarActiveTintColor={theme.tint}
      >
        <Tabs.Screen
          name="home"
          options={{
            role: "search",
            title: "Search",
            tabBarIcon: () => ({ sfSymbol: "magnifyingglass" }),
          }}
        />
        <Tabs.Screen
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              handleRecordPress();
            },
          }}
          name="record"
          options={{
            title: isRecording ? "Stop" : "Record",
            preventsDefault: true,
            tabBarIcon: () => ({
              sfSymbol: isRecording ? "stop.circle.fill" : "mic.circle.fill",
            }),
          }}
        />
      </Tabs>

      {showAccessoryView && (
        <RecordingAccessoryView
          durationMs={uiDurationMs}
          isRecording={isRecordingUI}
          mutation={mutation}
          onDiscardRecording={handleDiscardRecording}
        />
      )}
    </View>
  );
}
