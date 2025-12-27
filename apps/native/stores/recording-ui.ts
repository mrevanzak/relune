import { create } from "zustand";
import { createSelectors } from "@/lib/utils";

/**
 * Minimal ephemeral state for recording phase only.
 * No persistence needed - if app kills during recording, recording is lost anyway.
 *
 * This store only tracks the "recording" phase. Upload state is handled by
 * TanStack Query mutation (isPending, isSuccess, isError).
 */

interface RecordingUIState {
	isRecording: boolean;
	startedAt: number | null;
	durationMs: number;
	/** Reference to stop recorder function, set by record screen */
	stopRecorderRef: (() => Promise<{ uri: string } | null>) | null;
}

interface RecordingUIActions {
	startRecording: () => void;
	updateDuration: (durationMs: number) => void;
	stopRecording: () => void;
	setStopRecorderRef: (
		ref: (() => Promise<{ uri: string } | null>) | null,
	) => void;
	reset: () => void;
}

const initialState: RecordingUIState = {
	isRecording: false,
	startedAt: null,
	durationMs: 0,
	stopRecorderRef: null,
};

const recordingUIStoreBase = create<RecordingUIState & RecordingUIActions>()(
	(set, get) => ({
		...initialState,

		startRecording: () => {
			set({ isRecording: true, startedAt: Date.now(), durationMs: 0 });
		},

		updateDuration: (durationMs: number) => {
			if (get().isRecording) {
				set({ durationMs });
			}
		},

		stopRecording: () => {
			set({ isRecording: false, startedAt: null });
			// Keep durationMs for display during upload
		},

		setStopRecorderRef: (ref) => {
			set({ stopRecorderRef: ref });
		},

		reset: () => {
			set(initialState);
		},
	}),
);

export const recordingUIStore = createSelectors(recordingUIStoreBase);
