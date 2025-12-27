# Search & Management Implementation Plan

**Date:** 2025-12-27
**Status:** Complete
**Last Updated:** 2025-12-27

## Current Status (as of Dec 27, 2025)

### ✅ Completed

**Backend:**

- ✅ **User scoping**: `listRecordings` now filters by `userId`; `getRecording` enforces ownership
- ✅ **DELETE endpoint**: `DELETE /recordings/:id` with ownership validation
- ✅ **Storage deletion**: Added `deleteAudioFromStorage()` helper that parses public URLs and removes objects from Supabase Storage bucket
- ✅ **Search endpoint**: `GET /recordings?search=term` - searches transcript, originalFilename, and keywords using Drizzle `ilike` + `exists` subquery
- ✅ **PATCH endpoint**: `PATCH /recordings/:id` for editing `recordedAt` and replacing keywords

**Mobile:**

- ✅ **Delete feature**: `useDeleteRecordingMutation()` in `apps/native/features/recordings.ts`
- ✅ **Home screen delete**: iOS-only context menu using Expo Router `Link.Menu` with confirmation alert
- ✅ **Server-side search**: Home screen search bar with 300ms debounce, wired to backend search
- ✅ **Edit feature**: `useUpdateRecordingMutation()` in `apps/native/features/recordings.ts`
- ✅ **Edit modal**: `EditRecordingModal.tsx` with date picker + keyword input (comma-separated)
- ✅ **Detail screen edit UI**: Pencil + Trash icons in header, edit modal opens from detail screen

## Implementation Details

### Search Implementation

**Files Modified:**

- `apps/server/src/modules/recordings/model.ts` - Added `search` to `listQuerySchema`
- `apps/server/src/modules/recordings/service.ts` - Added search filter with EXISTS subquery for keywords
- `apps/server/src/modules/recordings/index.ts` - Passes search param to service
- `apps/native/app/(app)/(tabs)/home/index.tsx` - Added debounced search, wired to query

**Query Logic:**

```typescript
// Subquery for keyword matches - uses EXISTS for efficiency
const keywordMatch = db
  .select({ id: sql`1` })
  .from(recordingKeywords)
  .innerJoin(keywords, eq(recordingKeywords.keywordId, keywords.id))
  .where(
    and(
      eq(recordingKeywords.recordingId, recordings.id),
      ilike(keywords.name, searchTerm),
    ),
  );

whereCondition.push(
  or(
    ilike(recordings.transcript, searchTerm),
    ilike(recordings.originalFilename, searchTerm),
    exists(keywordMatch),
  )!,
);
```

**Mobile Debounce Pattern:**

```typescript
const [searchQuery, setSearchQuery] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");

useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
  return () => clearTimeout(timer);
}, [searchQuery]);

// Pass to query
useRecordingsWithPolling({ search: debouncedSearch || undefined });
```

### PATCH Endpoint (Edit Recording)

**Files Modified:**

- `apps/server/src/modules/recordings/model.ts` - Added `updateRecordingBodySchema`
- `apps/server/src/modules/recordings/service.ts` - Added `updateRecording` function + exported `saveKeywords`
- `apps/server/src/modules/recordings/index.ts` - Added PATCH route

**Schema:**

```typescript
export const updateRecordingBodySchema = t.Object({
  recordedAt: t.Optional(t.String()), // ISO 8601 string
  keywords: t.Optional(t.Array(t.String())), // Replaces all keywords
});
```

**Service Logic:**

1. Verify recording exists and user owns it
2. Update `recordedAt` if provided
3. If `keywords` provided: delete all existing keywords for this recording, then save new ones
4. Return updated recording with keywords

### Edit Modal

**Files Created:**

- `apps/native/components/EditRecordingModal.tsx`

**Features:**

- Modal with form sheet presentation style
- DateTimePicker for `recordedAt` (uses `@react-native-community/datetimepicker`)
- Text input for keywords (comma-separated)
- Save/Cancel buttons in header
- Uses `useUpdateRecordingMutation`

### Detail Screen Edit UI

**Files Modified:**

- `apps/native/app/(app)/recording/[id].tsx`

**Changes:**

- Added pencil icon button in header (next to trash)
- State for controlling edit modal visibility
- EditRecordingModal wired with recording data

## Home Screen Delete (iOS Context Menu)

**Files Modified:**

- `apps/native/app/(app)/(tabs)/home/index.tsx`
- `apps/native/features/recordings.ts`

**Implementation:**
Each `AudioCard` in the Home feed is wrapped with:

```tsx
<Link href={`/recording/${id}`}>
  <Link.Trigger>
    <View>
      <AudioCard {...props} />
    </View>
  </Link.Trigger>
  <Link.Menu>
    <Link.MenuAction
      title="Delete"
      icon="trash"
      destructive
      onPress={() => handleDelete(id, title)}
    />
  </Link.Menu>
</Link>
```

**UX Flow:**

1. User long-presses a recording card
2. iOS context menu appears with "Delete" (red/destructive)
3. Tapping Delete shows `Alert.alert` confirmation
4. On confirm, mutation fires and optimistically removes from cache

**Platform Notes:**

- iOS-only feature (Link Preview requires SDK 54+)
- Android users still have full delete capability via Detail screen
- Play button interaction is preserved (nested pressables work correctly)

## Files Summary

| File                                                | Action   | Purpose                                   |
| --------------------------------------------------- | -------- | ----------------------------------------- |
| `apps/server/src/modules/recordings/model.ts`       | Modified | Added `search` and `updateRecordingBodySchema` |
| `apps/server/src/modules/recordings/service.ts`     | Modified | Added search filter, `updateRecording`, exported `saveKeywords` |
| `apps/server/src/modules/recordings/index.ts`       | Modified | Added search param passing, PATCH route   |
| `apps/native/app/(app)/(tabs)/home/index.tsx`       | Modified | Added debounced search, removed client-side search filter |
| `apps/native/features/recordings.ts`                | Modified | Added `useUpdateRecordingMutation`        |
| `apps/native/components/EditRecordingModal.tsx`     | Created  | Edit modal with date picker + keywords    |
| `apps/native/app/(app)/recording/[id].tsx`          | Modified | Added edit button + modal integration     |

## Verification Checklist

- [ ] Search by transcript text works
- [ ] Search by keyword name works
- [ ] Search by original filename works
- [ ] Debounce works (no excessive API calls)
- [ ] Time filters still work client-side
- [ ] Edit modal opens from detail screen
- [ ] Date picker updates recordedAt
- [ ] Keyword editing replaces all keywords
- [ ] Delete still works from home screen (context menu)
- [ ] Delete still works from detail screen (header button)

## Future Enhancements

- PostgreSQL Full-Text Search with GIN index (if search performance becomes an issue at scale)
- Server-side time filtering (Today, This Week)
- Keyword chip editor (instead of comma-separated text)
