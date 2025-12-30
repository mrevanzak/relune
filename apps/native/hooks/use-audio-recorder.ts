import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
  useAudioRecorder as useExpoAudioRecorder,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

export interface RecordingResult {
  uri: string;
  durationSeconds: number;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPrepared: boolean;
  durationMs: number;
  start: () => Promise<void>;
  stop: () => Promise<RecordingResult | null>;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

/**
 * Custom hook for audio recording with duration tracking.
 * Wraps expo-audio's useAudioRecorder with additional state management.
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const [hasPermission, setHasPermission] = useState(false);
  const [isPrepared, setIsPrepared] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const recordingUriRef = useRef<string | null>(null);

  const recorder = useExpoAudioRecorder(
    RecordingPresets.HIGH_QUALITY,
    (status) => {
      if (status.isFinished && status.url) {
        recordingUriRef.current = status.url;
      }
    }
  );

  const recorderState = useAudioRecorderState(recorder);

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      try {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        setHasPermission(status.granted);

        if (status.granted) {
          await setAudioModeAsync({
            playsInSilentMode: true,
            allowsRecording: true,
          });
        }
      } catch (error) {
        console.error("Failed to get recording permissions:", error);
      }
    })();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setHasPermission(status.granted);

      if (status.granted) {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
      } else {
        Alert.alert(
          "Permission Required",
          "Microphone access is required to record audio."
        );
      }

      return status.granted;
    } catch (error) {
      console.error("Failed to request recording permissions:", error);
      return false;
    }
  }, []);

  const start = useCallback(async (): Promise<void> => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      recordingUriRef.current = null;
      await recorder.prepareToRecordAsync();
      setIsPrepared(true);
      startTimeRef.current = Date.now();
      recorder.record();
    } catch (error) {
      console.error("Failed to start recording:", error);
      setIsPrepared(false);
      throw error;
    }
  }, [hasPermission, requestPermission, recorder]);

  const stop = useCallback(async (): Promise<RecordingResult | null> => {
    if (!recorderState.isRecording) {
      return null;
    }

    try {
      await recorder.stop();
      setIsPrepared(false);

      const endTime = Date.now();
      const durationSeconds = startTimeRef.current
        ? Math.floor((endTime - startTimeRef.current) / 1000)
        : 0;

      startTimeRef.current = null;

      // Wait a bit for the recording URI to be available
      await new Promise((resolve) => setTimeout(resolve, 100));

      const uri = recordingUriRef.current;
      if (!uri) {
        console.error("Recording URI not available");
        return null;
      }

      return {
        uri,
        durationSeconds,
      };
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setIsPrepared(false);
      throw error;
    }
  }, [recorderState.isRecording, recorder]);

  // Calculate duration in milliseconds
  const durationMs = startTimeRef.current
    ? Date.now() - startTimeRef.current
    : 0;

  return {
    isRecording: recorderState.isRecording,
    isPrepared,
    durationMs,
    start,
    stop,
    hasPermission,
    requestPermission,
  };
}
