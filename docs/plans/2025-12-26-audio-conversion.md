# Audio Conversion Feature

**Date:** 2025-12-26  
**Status:** Implemented

## Overview

Server-side audio conversion from various formats (opus, ogg, wav, mp3, webm) to m4a (AAC) for iOS compatibility. All audio is converted on upload/import before storage.

## Implementation

### Dependencies

- `node-av` - Native Node.js bindings for FFmpeg with prebuilt binaries
- Platform-specific packages auto-installed (e.g., `@seydx/node-av-darwin-arm64`)

### Key Files

- `apps/server/src/shared/audio-converter.ts` - Core conversion utility
- `apps/server/src/modules/import/index.ts` - WhatsApp import integration
- `apps/server/src/modules/recordings/service.ts` - App recording integration

### API

```typescript
import { convertToM4a, needsConversion } from "@/shared/audio-converter";

// Check if file needs conversion
needsConversion("audio.opus"); // true
needsConversion("audio.m4a"); // false

// Convert audio
const result = await convertToM4a(audioBuffer, "original.opus");
// result.data: Uint8Array (m4a audio)
// result.filename: "original.m4a"
```

### Supported Input Formats

- `.opus` (WhatsApp voice messages)
- `.ogg`
- `.wav`
- `.mp3`
- `.webm`

### Output Format

- Container: m4a (ipod/MP4)
- Codec: AAC
- Bitrate: 128kbps
- Preserves original sample rate and channels

## Technical Details

### In-Memory Processing

All conversion happens in memory using Buffer I/O callbacks - no temp files are created on disk.

### Fragmented MP4

When writing to memory buffers, we use fragmented MP4 flags:

```typescript
movflags: "frag_keyframe+empty_moov+default_base_moof";
```

This ensures the moov atom (metadata) is written correctly without requiring seekable file output.

### Error Handling

```typescript
class AudioConversionError extends Error {
  code: "CONVERSION_FAILED" | "NO_AUDIO_STREAM";
}
```

Conversion failures reject the upload with an error message.

## Testing

```bash
cd apps/server
bun scripts/test-audio-converter.ts "/path/to/input.opus" "/tmp/relune-test-output.m4a"
open /tmp/relune-test-output.m4a
```

## Deployment Notes

The `node-av` package includes prebuilt binaries for:

- macOS (arm64, x64)
- Linux (x64, arm64)
- Windows (x64)

If postinstall scripts are blocked, run manually:

```bash
node node_modules/@seydx/node-av-*/install.js
```
