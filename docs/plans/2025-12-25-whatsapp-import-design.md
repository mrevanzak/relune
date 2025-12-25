# WhatsApp Import Feature Design

**Date**: 2025-12-25
**Status**: Approved
**Scope**: Task 7 in Implementation Plan

## Overview

Import WhatsApp voice note exports into Relune. Accepts a `.zip` file containing audio files and `_chat.txt` metadata. Transcription happens asynchronously via a polling job.

## Architecture

Three components:

1. **Import Endpoint** (`POST /import/whatsapp`) - Accepts zip, parses metadata, uploads audio, creates records
2. **Transcription Job** (`POST /recordings/process-pending`) - Polls for pending transcriptions, processes in batches
3. **User Resolution** - Matches sender names to users, auto-creates if not found

## API Design

### Import Endpoint

```
POST /import/whatsapp
Content-Type: multipart/form-data

Body: { file: <zip file> }

Response (200):
{
  "imported": 3,
  "skipped": 1,
  "failed": [{ "filename": "...", "error": "..." }],
  "recordings": [...]
}
```

### Transcription Job

```
POST /recordings/process-pending
Query: ?limit=10

Response (200):
{
  "processed": 3,
  "remaining": 0,
  "errors": []
}
```

## Data Mapping

| Field | Source |
|-------|--------|
| `userId` | Resolved from sender name via `display_name` lookup |
| `audioUrl` | Uploaded to Supabase Storage |
| `recordedAt` | Parsed from `[MM/DD/YY, HH:MM:SS]` in chat |
| `importSource` | `'whatsapp'` |
| `originalFilename` | e.g., `00000002-AUDIO-2025-12-25-16-05-29.opus` |
| `transcript` | `null` initially, filled by job |
| `notes` | Text message following audio (new field) |

## WhatsApp Export Format

```
[12/25/25, 16:05:29] Safi Fomba: <attached: 00000002-AUDIO-2025-12-25-16-05-29.opus>
[12/25/25, 16:05:49] Safi Fomba: Some text message
```

- Date format: `[MM/DD/YY, HH:MM:SS]`
- Sender: Name before `:`
- Audio: `<attached: FILENAME.opus>`
- Text after audio may be stored as `notes`

## Duplicate Detection

By `original_filename` - if a recording with the same filename exists for the same user, skip it.

## Error Handling

Partial success model:
- Import continues if individual files fail
- Response includes list of failures with reasons
- Successful imports are committed

## Schema Changes

Add `notes` field to `recordings` table:

```typescript
notes: text('notes'),  // Optional text context from WhatsApp
```

## Data Flow

```
Import Flow:
.zip → Extract → Parse _chat.txt → For each audio:
  → Check duplicate (by filename)
  → Resolve/create user (by display_name)
  → Upload to Supabase Storage
  → Insert recording (transcript: null)
→ Return summary

Transcription Job:
Trigger → Query WHERE transcript IS NULL (limit N)
  → Fetch audio from storage
  → Call AI SDK transcribe()
  → Update recording + generate keywords
→ Return processed count
```
