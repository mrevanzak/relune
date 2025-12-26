import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useCallback, useEffect, useRef } from "react";

/**
 * Hook for playing a single audio recording.
 * Uses expo-audio under the hood.
 *
 * @param audioUrl - URL of the audio to play (or null if none selected)
 * @returns Playback controls and state
 */
export function useRecordingPlayer(audioUrl: string | null) {
	const player = useAudioPlayer(audioUrl ?? "");
	const status = useAudioPlayerStatus(player);
	const previousUrlRef = useRef<string | null>(null);

	// Auto-play when URL changes to a new non-null value
	useEffect(() => {
		if (audioUrl && audioUrl !== previousUrlRef.current) {
			// Small delay to ensure player is ready
			const timer = setTimeout(() => {
				player.play();
			}, 100);
			return () => clearTimeout(timer);
		}
		previousUrlRef.current = audioUrl;
	}, [audioUrl, player]);

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
		[player],
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
		currentTime: status.currentTime,
		duration: status.duration,
		isLoaded: audioUrl !== null && status.duration > 0,
	};
}
