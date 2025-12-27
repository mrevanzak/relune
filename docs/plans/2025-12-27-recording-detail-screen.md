# Recording Detail Screen Implementation Plan

**Date:** 2025-12-27
**Status:** Ready for Implementation
**Estimated Time:** ~3-4 hours
**Prerequisite:** Recording Save Flow (Complete)

## Overview

Implement a recording detail screen that displays full transcript, audio playback controls, and metadata. Users can tap any `AudioCard` in the timeline to navigate to this screen.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Navigation | Push screen via Expo Router | Standard iOS pattern, maintains back button |
| Audio controls | Reuse `useRecordingPlayer` hook | Already works, proven pattern |
| Transcript display | ScrollView with styled text | Simple, readable, full content |
| Edit metadata | Phase 2 (separate plan) | Keep scope focused on read-only first |
| Layout | Single scrollable view | Audio player sticky at bottom |

## Screen Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ←  Recording                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Recording - Dec 25                                             │
│  Today, 3:42 PM  •  2:34                                        │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Keywords                                                 │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                     │  │
│  │  │ cooking │ │  family │ │ weekend │                     │  │
│  │  └─────────┘ └─────────┘ └─────────┘                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Transcript                                               │  │
│  │                                                           │  │
│  │  Lorem ipsum dolor sit amet, consectetur adipiscing      │  │
│  │  elit. Sed do eiusmod tempor incididunt ut labore et     │  │
│  │  dolore magna aliqua. Ut enim ad minim veniam, quis      │  │
│  │  nostrud exercitation ullamco laboris nisi ut aliquip    │  │
│  │  ex ea commodo consequat...                               │  │
│  │                                                           │  │
│  │  (scrollable if long)                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │     ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌     │  │
│  │                                                           │  │
│  │  0:42 ─────────●────────────────────────────── 2:34       │  │
│  │                                                           │  │
│  │            ⏪15    ▶ Play    15⏩                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Task 1: Add Single Recording Query

**File:** `apps/native/queries/recordings.ts`

Add a query for fetching a single recording by ID.

**Implementation:**
```typescript
export const recordingQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["recordings", id],
    queryFn: async () => {
      const { data, error } = await api.recordings({ id }).get();
      if (error) {
        throw new Error(error.value?.message ?? "Failed to fetch recording");
      }

      if ("error" in data) {
        const errorData = data.error as { message?: string };
        throw new Error(errorData.message ?? "Failed to fetch recording");
      }

      return data.recording;
    },
  });
```

---

### Task 2: Create Detail Screen Route

**File:** `apps/native/app/(app)/recording/[id].tsx`

Create the dynamic route for recording details.

**Implementation:**
```typescript
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { recordingQueryOptions } from "@/queries/recordings";
import { RecordingDetail } from "@/components/RecordingDetail";

export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const { data: recording, isLoading, error } = useQuery(
    recordingQueryOptions(id)
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !recording) {
    return <ErrorState message={error?.message ?? "Recording not found"} />;
  }

  return <RecordingDetail recording={recording} />;
}
```

---

### Task 3: Create RecordingDetail Component

**File:** `apps/native/components/RecordingDetail.tsx`

Main component that displays recording information.

**Props:**
```typescript
interface RecordingDetailProps {
  recording: RecordingWithKeywords;
}
```

**Sections:**
1. **Header**: Title (date-based), metadata (date, duration)
2. **Keywords**: Horizontal pill list in a `SoftCard`
3. **Transcript**: Full text in a `SoftCard`, scrollable
4. **Player**: Sticky audio controls at bottom

**Styling:**
- Use existing theme colors
- Reuse `SoftCard` for content sections
- Match visual style of `AudioCard`

---

### Task 4: Create AudioPlayer Component

**File:** `apps/native/components/ui/AudioPlayer.tsx`

A full-featured audio player with seek, skip, and progress.

**Props:**
```typescript
interface AudioPlayerProps {
  audioUrl: string;
  durationSeconds: number;
}
```

**Features:**
- Play/Pause button (large, centered)
- Skip back 15s / Skip forward 15s buttons
- Progress slider (Reanimated for smooth dragging)
- Current time / Total duration display
- Waveform visualization (optional, static like `AudioCard`)

**Implementation:**
- Reuse `useRecordingPlayer` hook
- Add `seekTo(seconds)` and `skip(delta)` to the hook if not present
- Use `@react-native-community/slider` or custom Reanimated slider

---

### Task 5: Update useRecordingPlayer Hook

**File:** `apps/native/hooks/use-audio-player.ts`

Extend the hook with additional controls needed for detail view.

**New capabilities:**
```typescript
interface RecordingPlayerReturn {
  // Existing
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;      // Current position in seconds
  duration: number;         // Total duration in seconds
  togglePlayPause: () => void;
  
  // New
  seekTo: (seconds: number) => void;
  skip: (deltaSeconds: number) => void;  // +15 or -15
}
```

**Behavior:**
- `seekTo(seconds)`: Jump to specific position
- `skip(delta)`: Add delta to current position (clamped to 0 and duration)

---

### Task 6: Wire Navigation from AudioCard

**File:** `apps/native/app/(app)/(tabs)/home/index.tsx`

Make tapping an `AudioCard` navigate to the detail screen.

**Changes:**
1. Wrap `AudioCard` in `Pressable` or use `PressableScale`
2. On press, navigate to `/recording/${id}`
3. Keep play button behavior separate (only plays audio, doesn't navigate)

```typescript
import { router } from "expo-router";

// In renderItem
<Pressable onPress={() => router.push(`/recording/${item.id}`)}>
  <AudioCard
    title={...}
    onPlay={() => handlePlay(item.id)}  // Play button still works
  />
</Pressable>
```

---

### Task 7: Add Animations and Polish

**File:** `apps/native/components/RecordingDetail.tsx`

**Animations:**
1. **Entering animation**: Fade in content sections
2. **Progress bar**: Smooth animation via Reanimated
3. **Play button**: Scale spring on press

**Haptics:**
- Play/Pause: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`
- Skip: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`
- Seek complete: `Haptics.selectionAsync()`

---

## Task Dependencies

```
Task 1 (Query) ──────────┬──▶ Task 2 (Route)
                         │
                         └──▶ Task 3 (Detail Component)
                                      │
                                      ├──▶ Task 4 (AudioPlayer)
                                      │
                                      └──▶ Task 5 (Hook extensions)

Task 6 (Navigation wiring) depends on Task 2

Task 7 (Polish) depends on Tasks 3, 4, 5
```

**Execution order:** 1 → 2 → 3 → 4 → 5 → 6 → 7

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `queries/recordings.ts` | Modify | Add single recording query |
| `app/(app)/recording/[id].tsx` | Create | Detail screen route |
| `components/RecordingDetail.tsx` | Create | Main detail layout |
| `components/ui/AudioPlayer.tsx` | Create | Full audio player component |
| `hooks/use-audio-player.ts` | Modify | Add seekTo, skip controls |
| `app/(app)/(tabs)/home/index.tsx` | Modify | Add navigation on card tap |

---

## Time Estimates

| Task | Estimate |
|------|----------|
| Task 1: Query | 15 min |
| Task 2: Route | 15 min |
| Task 3: Detail Component | 1 hr |
| Task 4: AudioPlayer | 1 hr |
| Task 5: Hook extensions | 30 min |
| Task 6: Navigation wiring | 15 min |
| Task 7: Animations/Polish | 45 min |
| **Total** | **~4 hours** |

---

## API Requirements

The `GET /recordings/:id` endpoint already exists and returns:
```typescript
{
  recording: {
    id: string;
    userId: string;
    audioUrl: string;
    durationSeconds: number | null;
    fileSizeBytes: number | null;
    transcript: string | null;
    language: "en" | "fr" | "mixed" | null;
    recordedAt: Date;
    importSource: "app" | "whatsapp";
    originalFilename: string | null;
    createdAt: Date;
    updatedAt: Date;
    keywords: Array<{ id: string; name: string }>;
  }
}
```

No backend changes needed for read-only detail view.

---

## Verification Checklist

- [ ] Tap AudioCard → navigates to detail screen
- [ ] Back button returns to timeline
- [ ] Full transcript is visible and scrollable
- [ ] Keywords display correctly
- [ ] Play/Pause works
- [ ] Skip forward/back 15s works
- [ ] Progress slider updates during playback
- [ ] Dragging slider seeks audio
- [ ] Loading state shows while fetching
- [ ] Error state shows on network failure
- [ ] Haptic feedback on interactions
- [ ] Smooth animations (60fps)

---

## Future Enhancements (Not in Scope)

These will be addressed in a separate plan:

- **Edit date/time**: Needs `PATCH /recordings/:id` endpoint + UI modal
- **Edit keywords**: Add/remove keyword chips + server endpoint
- **Delete recording**: Confirmation modal + `DELETE /recordings/:id` endpoint
- **Share/export**: Generate shareable link or export audio file
