import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useCallback, useEffect, useRef } from "react";

interface UseRecordingPlayerOptions {
  /** If true, auto-play when the URL changes to a new non-null value. Defaults to false. */
  autoPlay?: boolean;
}

/**
 * Hook for playing a single audio recording.
 * Uses expo-audio under the hood.
 *
 * @param audioUrl - URL of the audio to play (or null if none selected)
 * @param options - Configuration options
 * @returns Playback controls and state
 */
export function useRecordingPlayer(
  audioUrl: string | null,
  options?: UseRecordingPlayerOptions
) {
  const { autoPlay = false } = options ?? {};
  const player = useAudioPlayer(audioUrl ?? "");
  const status = useAudioPlayerStatus(player);
  const previousUrlRef = useRef<string | null>(null);

  // Ensure playback volume is at maximum (1.0) for louder audio
  useEffect(() => {
    player.volume = 1.0;
  }, [player]);

  // Auto-play when URL changes to a new non-null value (only if autoPlay is enabled)
  useEffect(() => {
    if (autoPlay && audioUrl && audioUrl !== previousUrlRef.current) {
      // Small delay to ensure player is ready
      const timer = setTimeout(() => {
        player.play();
      }, 100);
      return () => clearTimeout(timer);
    }
    previousUrlRef.current = audioUrl;
  }, [autoPlay, audioUrl, player]);

  const play = useCallback(() => {
    player.play();
  }, [player]);

  const pause = useCallback(() => {
    player.pause();
  }, [player]);

  const togglePlayPause = useCallback(() => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, status.playing]);

  const replay = useCallback(() => {
    player.seekTo(0);
    player.play();
  }, [player]);

  const seekTo = useCallback(
    (seconds: number) => {
      player.seekTo(seconds);
    },
    [player]
  );

  return {
    // Controls
    play,
    pause,
    togglePlayPause,
    replay,
    seekTo,
    // State
    isPlaying: status.playing,
    isLoaded: status.isLoaded,
    isBuffering: status.isBuffering,
    reasonForWaitingToPlay: status.reasonForWaitingToPlay,
    currentTime: status.currentTime,
    duration: status.duration,
  };
}
