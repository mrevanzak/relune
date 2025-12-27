# Native Recording Backlog

**Last Updated:** 2025-12-27

Features to implement after the core recording save flow is complete.

> **Note:** Recording Save Flow is now complete (2025-12-27). These backlog items can be prioritized.

---

## Backlog Items

| ID | Feature | Description | Priority | Complexity | Notes |
|----|---------|-------------|----------|------------|-------|
| B1 | Now Playing Mini-Player | Persistent playback controls in bottom accessory when playing from timeline | P1 | Medium | Share accessory view real estate with recording states |
| B2 | Live Waveform Visualization | Real-time audio waveform during recording | P2 | Medium | Use expo-audio metering API if available |
| B3 | Recording Preview | Option to listen before auto-save | P2 | Low | Could be a settings toggle |
| B4 | Pause/Resume Recording | Add pause button during recording | P2 | Low | expo-audio supports this natively |
| B5 | Upload Progress | Show actual upload progress percentage | P3 | Medium | Needs XMLHttpRequest or fetch progress tracking |
| B6 | Offline Queue Indicator | Visual badge/indicator for queued recordings | P2 | Low | Integrate with existing upload-queue store |
| B7 | Recording Quality Settings | Allow user to choose quality (file size tradeoff) | P3 | Low | Expose expo-audio presets |

---

## Priority Definitions

- **P1**: Should implement soon, high user value
- **P2**: Nice to have, improves experience
- **P3**: Low priority, polish/optimization

---

## Feature Details

### B1: Now Playing Mini-Player

**Problem:** When playing a recording from the home timeline, navigating to another tab loses playback context. User can't see what's playing or control it.

**Proposed Solution:**
- Extend `RecordingAccessoryView` to handle a `playing` state
- When audio is playing from home screen, show mini-player:
  ```
  ┌─────────────────────────────────────────────────────────────────┐
  │   Recording Title              ▶ ▐▐  ══════════────  ✕          │
  └─────────────────────────────────────────────────────────────────┘
  ```
- Tap to expand or navigate to recording detail
- X to stop playback

**Dependencies:** 
- Requires lifting player state to a global store or context
- Coordinate with recording session store (recording takes priority)

---

### B2: Live Waveform Visualization

**Problem:** During recording, there's no visual feedback of audio input levels.

**Proposed Solution:**
- Use expo-audio's metering/level data if available
- Display animated bars that respond to audio input
- Fallback to simple pulsing if metering not supported

**Technical Notes:**
- Check if `expo-audio` exposes `onRecordingStatusUpdate` with metering
- May need native module for real-time audio levels

---

### B3: Recording Preview

**Problem:** Auto-save means user can't preview before uploading.

**Proposed Solution:**
- Add a settings toggle: "Preview before saving"
- When enabled, after recording stops:
  - Show play button in accessory view
  - User can listen, then tap Save or Discard
- Default: OFF (current auto-save behavior)

---

### B4: Pause/Resume Recording

**Problem:** User can't pause during a recording session.

**Proposed Solution:**
- Add pause button next to discard during recording
- State: `recording` → `paused` → `recording` → ...
- Update accessory view to show pause/resume controls
- `expo-audio` recorder supports `pause()` and `resume()`

---

### B5: Upload Progress

**Problem:** "Saving..." state shows spinner but no progress indication.

**Proposed Solution:**
- Track upload progress via XMLHttpRequest or fetch with progress events
- Show progress bar in uploading state
- Requires changes to `uploadRecording()` function

---

### B6: Offline Queue Indicator

**Problem:** When recordings are queued for later upload, user has no visibility.

**Proposed Solution:**
- Show badge on home tab or in accessory view when queue has items
- "2 recordings pending upload" message
- Tap to see queue status

---

### B7: Recording Quality Settings

**Problem:** No control over recording quality/file size.

**Proposed Solution:**
- Settings screen with quality options:
  - High (current default)
  - Medium (smaller files)
  - Low (minimal size)
- Map to expo-audio `RecordingPresets`
