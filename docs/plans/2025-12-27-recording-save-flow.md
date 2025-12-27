# Recording Save Flow Implementation Plan

**Date:** 2025-12-27
**Status:** Complete
**Completed:** 2025-12-27

## Overview

Implement auto-save flow for recordings with visual feedback via `renderBottomAccessoryView` in the tabs layout. Show recording indicator during recording, upload status after stopping.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Save behavior | Auto-save on stop | Reduce friction, no preview step |
| Discard option | Available during recording + error | User can abort at any point |
| Error handling | Keep error visible until user acts | Don't auto-queue silently |
| Styling | Subtle/neutral | Not distracting, matches app tone |
| Animations | Simple (pulse, fade) | MVP approach, no live waveform |

## State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                    Recording Accessory States                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   idle ──────▶ recording ──────▶ uploading ──────▶ success      │
│    ▲              │                  │               │          │
│    │              │ (discard)        │ (error)       │ (2s)     │
│    │              ▼                  ▼               ▼          │
│    └────────── idle ◀────────── error ◀──────────── idle        │
│                 ▲                 │                              │
│                 │                 │ (retry)                      │
│                 │                 ▼                              │
│                 │             uploading                          │
│                 │                                                │
│                 └─────── (discard from error)                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## UI Mockups

**Recording state:**
```
┌─────────────────────────────────────────────────────────────────┐
│   ●  Recording                              00:42    [Discard]  │
│      ● ● ● (subtle pulsing indicator)                           │
└─────────────────────────────────────────────────────────────────┘
   └── red dot, neutral text, muted discard button
```

**Uploading state:**
```
┌─────────────────────────────────────────────────────────────────┐
│   ◐  Saving...                                          00:42   │
└─────────────────────────────────────────────────────────────────┘
   └── spinner, neutral text
```

**Success state (auto-dismiss 2s):**
```
┌─────────────────────────────────────────────────────────────────┐
│   ✓  Saved                                                      │
└─────────────────────────────────────────────────────────────────┘
   └── green checkmark, then fade out
```

**Error state:**
```
┌─────────────────────────────────────────────────────────────────┐
│   ✗  Failed to save                         [Discard]  [Retry]  │
└─────────────────────────────────────────────────────────────────┘
   └── red X, muted text, action buttons
```

---

## Implementation Tasks

### Task 1: Create Recording Session Store

**File:** `apps/native/stores/recording-session.ts`

Create a Zustand store to manage the recording session state machine.

**Types:**
```typescript
type RecordingSessionState = 
  | { status: 'idle' }
  | { status: 'recording'; startedAt: number; durationMs: number }
  | { status: 'uploading'; uri: string; durationSeconds: number; recordedAt: Date }
  | { status: 'success' }
  | { status: 'error'; uri: string; durationSeconds: number; recordedAt: Date; message: string }

interface RecordingSessionActions {
  startRecording: () => void
  updateDuration: (durationMs: number) => void
  stopRecording: (uri: string, durationSeconds: number) => void
  uploadSuccess: () => void
  uploadError: (message: string) => void
  retry: () => void
  discard: () => Promise<void>
  reset: () => void
}
```

**Behavior:**
- `startRecording()`: Set status to `recording` with current timestamp
- `updateDuration(ms)`: Update `durationMs` for display
- `stopRecording(uri, duration)`: Transition to `uploading` state
- `uploadSuccess()`: Transition to `success` state
- `uploadError(msg)`: Transition to `error` state, preserve URI/duration for retry
- `retry()`: Transition back to `uploading` from `error`
- `discard()`: Delete local file, reset to `idle`
- `reset()`: Return to `idle` state

---

### Task 2: Create RecordingAccessoryView Component

**File:** `apps/native/components/RecordingAccessoryView.tsx`

A component that renders different UI based on the session state.

**Implementation:**
- Subscribe to `useRecordingSessionStore`
- Return `null` when `status === 'idle'`
- Render appropriate UI for each state
- Use Reanimated for animations:
  - Pulsing red dot during recording (opacity animation)
  - Fade transitions between states
- Use `expo-haptics` for feedback
- Subtle styling: neutral grays, muted buttons

**Props:** None (reads from store)

**Sub-components:**
- `RecordingIndicator`: Red dot + duration + discard button
- `UploadingIndicator`: Spinner + "Saving..." + duration
- `SuccessIndicator`: Checkmark + "Saved"
- `ErrorIndicator`: X icon + message + Retry/Discard buttons

---

### Task 3: Wire Up Tabs Layout

**File:** `apps/native/app/(app)/(tabs)/_layout.tsx`

Connect the recording session store and accessory view.

**Changes:**
1. Import `useRecordingSessionStore` and `RecordingAccessoryView`
2. Modify `handleRecordPress()`:
   - On start: call `store.startRecording()`
   - On stop: call `store.stopRecording(result.uri, result.durationSeconds)`
3. Add duration update interval during recording
4. Enable `renderBottomAccessoryView`:
   ```tsx
   renderBottomAccessoryView={() => <RecordingAccessoryView />}
   ```

---

### Task 4: Connect Upload Mutation to Session Flow

**File:** `apps/native/features/upload.ts`

Create a hook that triggers upload when session enters `uploading` state.

**New hook:** `useRecordingSessionUpload()`

**Behavior:**
- Use `useEffect` to watch store state
- When `status === 'uploading'`:
  - Call existing `uploadRecording()` function
  - On success: `store.uploadSuccess()`
  - On error: `store.uploadError(error.message)`
- Integrate with existing upload queue for network errors

**Usage:** Call this hook in the tabs layout or a provider component.

---

### Task 5: Implement Discard Flow

**Files:** Store + Component

**Store (`discard` action):**
```typescript
discard: async () => {
  const state = get();
  let uri: string | null = null;
  
  if (state.status === 'recording') {
    // Stop recording first, get URI
    // This needs coordination with the recorder hook
  } else if (state.status === 'error') {
    uri = state.uri;
  }
  
  if (uri) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
  
  set({ status: 'idle' });
}
```

**Component (confirmation):**
- Show `Alert.alert()` before discarding
- Different messages for recording vs error state:
  - Recording: "Stop and discard this recording?"
  - Error: "Discard this recording? It won't be saved."

---

### Task 6: Add Animations and Polish

**File:** `apps/native/components/RecordingAccessoryView.tsx`

**Animations:**
1. **Pulsing red dot** during recording:
   ```typescript
   const pulse = useSharedValue(1);
   useEffect(() => {
     pulse.value = withRepeat(
       withSequence(
         withTiming(0.4, { duration: 800 }),
         withTiming(1, { duration: 800 })
       ),
       -1,
       true
     );
   }, []);
   ```

2. **State transitions**: Use Reanimated's `entering`/`exiting`:
   ```tsx
   <Animated.View entering={FadeIn} exiting={FadeOut}>
   ```

3. **Auto-dismiss success**: 
   ```typescript
   useEffect(() => {
     if (status === 'success') {
       const timer = setTimeout(() => store.reset(), 2000);
       return () => clearTimeout(timer);
     }
   }, [status]);
   ```

**Haptics:**
- Recording start: `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`
- Recording stop: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`
- Upload success: `Haptics.notificationAsync(NotificationFeedbackType.Success)`
- Upload error: `Haptics.notificationAsync(NotificationFeedbackType.Error)`

---

## Task Dependencies

```
Task 1 (Store) ─────┬──▶ Task 3 (Layout wiring)
                    │
                    └──▶ Task 2 (Component) ──▶ Task 6 (Animations)
                              │
                              └──▶ Task 5 (Discard)

Task 4 (Upload connection) depends on Task 1 + Task 3
```

**Execution order:** 1 → 2 → 3 → 4 → 5 → 6

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `stores/recording-session.ts` | Create | Session state machine |
| `components/RecordingAccessoryView.tsx` | Create | Bottom accessory UI |
| `app/(app)/(tabs)/_layout.tsx` | Modify | Wire up accessory view |
| `features/upload.ts` | Modify | Connect upload to session |

---

## Time Estimates

| Task | Estimate |
|------|----------|
| Task 1: Store | 30 min |
| Task 2: Component | 1 hr |
| Task 3: Layout | 30 min |
| Task 4: Upload | 30 min |
| Task 5: Discard | 30 min |
| Task 6: Animations | 45 min |
| **Total** | **~4 hours** |

---

## Verification Checklist

- [x] Recording starts → red dot visible with duration counting
- [x] Discard during recording → confirmation → file deleted → idle
- [x] Recording stops → auto-upload starts → spinner visible
- [x] Upload succeeds → success message → auto-dismiss after 2s
- [x] Upload fails → error visible with Retry/Discard buttons
- [x] Retry → upload attempts again
- [x] Discard from error → confirmation → file deleted → idle
- [x] Haptic feedback on all state transitions
- [x] Animations smooth (60fps)
- [x] Accessory view doesn't interfere with tab bar interaction

## Implementation Notes

**Completed 2025-12-27**

Implemented with some simplifications from the original plan:

1. **Store**: Created `stores/recording-ui.ts` instead of `recording-session.ts`. Simplified to only track recording phase (isRecording, durationMs). Upload state is handled entirely by TanStack Query mutation (isPending, isSuccess, isError).

2. **Component**: `RecordingAccessoryView` receives props from parent rather than reading from store directly. This allows the tabs layout to orchestrate both recording state and mutation state.

3. **Upload API**: Changed from multipart file upload to base64-encoded string to fix React Native FormData compatibility issues with Eden Treaty.

4. **Glass effect**: Uses `expo-glass-effect` (GlassView) on iOS 26+ with `expo-blur` (BlurView) fallback.

### Files Created/Modified

| File | Action |
|------|--------|
| `stores/recording-ui.ts` | Created |
| `components/RecordingAccessoryView.tsx` | Created |
| `app/(app)/(tabs)/_layout.tsx` | Modified |
| `features/upload.ts` | Modified |
| `lib/upload-recording.ts` | Modified |
| `server/modules/recordings/service.ts` | Modified |
| `server/modules/recordings/model.ts` | Modified |
