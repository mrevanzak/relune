# Current & Archived Sections Design

## Overview

Separate recordings into two distinct sections:

1. **Current/Live** - Voice notes recorded directly in the app
2. **Archived/Memories** - Imported WhatsApp chats + auto/manually archived recordings

Both users in a shared private space can access all recordings, with clear sender attribution.

## Progress (Implementation Status)

**Last updated:** 2025-12-30

- [x] **Task 1: Database Schema Migration** ✅ Completed
- [x] **Task 2: API - Users & Settings Endpoints** ✅ Completed
- [x] **Task 3: API - Sender Mappings Endpoints** ✅ Completed
- [x] **Task 4: API - Recordings Tab Filter & Archive Actions** ✅ Completed
- [x] **Task 5: API - Import with Sender Mappings** ✅ Completed
- [x] **Task 6: Native - SegmentedControl Component** ✅ Completed
- [x] **Task 7: Native - Enhanced AudioCard for Archived** ✅ Completed
- [x] **Task 8: Native - Home Screen Tab Integration** ✅ Completed
- [x] **Task 9: Native - Sender Mapping Screen** ✅ Completed
- [x] **Task 10: Native - Import Flow Integration** ✅ Completed
- [x] **Task 11: Native - Settings Screen** ✅ Completed

## Data Model Changes

### Recordings Table Extensions

Add to `recordings` table:

| Field          | Type                        | Purpose                                   |
| -------------- | --------------------------- | ----------------------------------------- |
| `senderId`     | uuid (nullable, FK → users) | Original sender (different from uploader) |
| `isArchived`   | boolean, default false      | Whether recording is in Archived section  |
| `archivedAt`   | timestamp (nullable)        | When it was archived                      |
| `importedAt`   | timestamp (nullable)        | When WhatsApp import happened             |
| `importedById` | uuid (nullable, FK → users) | Who performed the import                  |

### New Table: sender_mappings

| Field          | Type             | Purpose                            |
| -------------- | ---------------- | ---------------------------------- |
| `id`           | uuid, PK         | Primary key                        |
| `userId`       | uuid, FK → users | User who created this mapping      |
| `externalName` | text             | Name from WhatsApp (e.g., "Sarah") |
| `mappedUserId` | uuid, FK → users | Which user account it maps to      |
| `createdAt`    | timestamp        | When mapping was created           |

Unique constraint: `(userId, externalName)`

### New Table: user_settings

| Field             | Type                 | Purpose                                    |
| ----------------- | -------------------- | ------------------------------------------ |
| `userId`          | uuid, PK, FK → users | Primary key                                |
| `autoArchiveDays` | integer (nullable)   | Days before auto-archive (null = disabled) |
| `createdAt`       | timestamp            | When created                               |
| `updatedAt`       | timestamp            | When last updated                          |

## Navigation Structure

### Home Screen Tabs

```
┌─────────────────────────────────────┐
│  Relune                         ⬆️  │  ← Header with import button
├─────────────────────────────────────┤
│  [ Current ]  [ Archived ]          │  ← Segmented control
├─────────────────────────────────────┤
│  (Recording list)                   │
└─────────────────────────────────────┘
```

### Current Tab

- Query: `isArchived = false AND importSource = 'app'`
- Filter pills: Today, This Week, All Time
- Section title: "Recent Recordings"
- No sender attribution (all from current user)

### Archived Tab

- Query: `isArchived = true OR importSource = 'whatsapp'`
- Filter pills: All, From Me, From Partner
- Visual badge by source: WhatsApp (green) vs In-app archived (lilac)
- Shows sender name + avatar
- Shows both timestamps: original + imported

## Recording Card UI

### Current Tab Card (unchanged)

Standard AudioCard with title, date, duration, transcript preview, keywords.

### Archived Tab Card (enhanced)

```
┌──────────────────────────────────────────────┐
│  ┌────┐                                      │
│  │ 🎵 │  Morning thoughts             ▶️    │
│  │    │  Sarah                               │  ← Sender name
│  └────┘  Dec 1, 2024 • 2:34                 │
│                                              │
│  "Had a great idea about the trip..."       │
│                                              │
│  💬 Imported Dec 30 by Michael              │  ← Source badge + import info
│  ┌─────┐ ┌──────┐                           │
│  │ trip │ │ idea │                          │
│  └─────┘ └──────┘                           │
└──────────────────────────────────────────────┘
```

### Source Visual Differentiation

| Source          | Icon | Color             |
| --------------- | ---- | ----------------- |
| WhatsApp import | 💬   | Subtle green tint |
| In-app archived | 📦   | Lilac (brand)     |

## WhatsApp Import Flow

```
1. User taps import → picks WhatsApp export
              ↓
2. Parse chat: extract sender names + audio files
              ↓
3. Show Sender Mapping Screen
              ↓
4. User maps each name → registered user
              ↓
5. Process import with senderId assignments
              ↓
6. Navigate to Archived tab
```

### Sender Mapping Screen

```
┌─────────────────────────────────────────────┐
│  ← Back            Map Senders        Done  │
├─────────────────────────────────────────────┤
│                                             │
│  We found 2 people in this chat.            │
│  Please map each name to a user:            │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  "Sarah"                            │    │
│  │  [ sarah@email.com            ▼ ]   │    │
│  │  ☑️ Remember this mapping           │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  "Michael"                          │    │
│  │  [ Select user...             ▼ ]   │    │
│  │  ☑️ Remember this mapping           │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [ Continue Import ]                        │
│                                             │
│  Found: 12 voice messages                   │
│  6 from Sarah • 6 from Michael              │
└─────────────────────────────────────────────┘
```

Pre-fill from saved mappings, allow override.

## Settings

```
┌─────────────────────────────────────────────┐
│  AUTO-ARCHIVE                               │
│  ┌─────────────────────────────────────┐    │
│  │  Move to Archived after:            │    │
│  │  ○ Off (manual only)                │    │
│  │  ○ 7 days                           │    │
│  │  ● 14 days                    ✓     │    │
│  │  ○ 30 days                          │    │
│  │  ○ 60 days                          │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  SAVED MAPPINGS                             │
│  ┌─────────────────────────────────────┐    │
│  │  "Sarah" → sarah@email.com     ✕    │    │
│  │  "Michael" → michael@email.com ✕    │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

## Auto-Archive Logic

Client-side on fetch approach:

- When fetching Current tab recordings, server checks each recording's age
- If older than user's `autoArchiveDays` setting, marks `isArchived = true`
- Happens transparently during query

## API Changes

### oRPC Procedures (Implemented via `packages/api` + `/rpc`)

Note: This repo’s “API layer” for the native app is **oRPC** (procedures on `appRouter`), mounted by the server at `/rpc/*`.

### New Procedures

| Procedure                             | Purpose                               |
| ------------------------------------- | ------------------------------------- |
| `users.list`                          | List all users (for mapping dropdown) |
| `recordings.list` (`tab: "current"`)  | Non-archived, in-app recordings       |
| `recordings.list` (`tab: "archived"`) | Archived + imported recordings        |
| `recordings.archive`                  | Manually archive a recording          |
| `recordings.unarchive`                | Move back to Current                  |
| `senderMappings.list`                 | Get user's saved mappings             |
| `senderMappings.upsert`               | Create/update a mapping               |
| `senderMappings.delete`               | Remove saved mapping                  |
| `settings.get`                        | Get user settings                     |
| `settings.update`                     | Update user settings                  |

### Modified: POST /import/whatsapp

Accept sender mappings:

```typescript
{
  files: [...],
  senderMappings: {
    "Sarah": "user-uuid-1",
    "Michael": "user-uuid-2"
  },
  saveMappings: boolean
}
```

### Extended Recording Response

```typescript
{
  id: string,
  // ... existing fields ...
  senderId: string | null,
  senderName: string | null,
  isArchived: boolean,
  archivedAt: string | null,
  importedAt: string | null,
  importedByName: string | null
}
```

---

# Implementation Tasks

## Task 1: Database Schema Migration

**Scope:** Database layer only  
**Depends on:** Nothing  
**Files:**

- `packages/db/src/schema/index.ts` - Add new fields to recordings, create new tables

**Details:**

1. Add to recordings table:

   - `senderId` uuid nullable, FK → users
   - `isArchived` boolean default false
   - `archivedAt` timestamp nullable
   - `importedAt` timestamp nullable
   - `importedById` uuid nullable, FK → users

2. Create `senderMappings` table:

   - id, userId, externalName, mappedUserId, createdAt
   - Unique constraint on (userId, externalName)

3. Create `userSettings` table:

   - userId (PK), autoArchiveDays, createdAt, updatedAt

4. Export all types

**Verification:** Run `bun check` and `bun turbo check-types`

---

## Task 2: API - Users & Settings Endpoints

**Scope:** API layer  
**Depends on:** Task 1  
**Files:**

- `packages/api/src/routers/users.ts` - New router for listing users
- `packages/api/src/routers/settings.ts` - New router for user settings CRUD
- `packages/api/src/routers/index.ts` - Register new routers

**Details:**

1. `users.list` - Return list of all users (id, email, displayName)
2. `settings.get` - Get current user's settings (create default if not exists)
3. `settings.update` - Update autoArchiveDays

**Verification:** Test endpoints with curl or API client

---

## Task 3: API - Sender Mappings Endpoints

**Scope:** API layer  
**Depends on:** Task 1  
**Files:**

- `packages/api/src/routers/sender-mappings.ts` - New router

**Details:**

1. `senderMappings.list` - List user's saved mappings
2. `senderMappings.upsert` - Create or update mapping (upsert on externalName)
3. `senderMappings.delete` - Delete a mapping

**Verification:** Test endpoints with curl or API client

---

## Task 4: API - Recordings Tab Filter & Archive Actions

**Scope:** API layer  
**Depends on:** Task 1  
**Files:**

- `packages/api/src/routers/recordings.ts` - Extend existing router
- `packages/api/src/services/recordings.ts` - Add archive logic

**Details:**

1. Add `tab` param to `recordings.list` input:
   - `current`: `isArchived = false AND importSource = 'app'`
   - `archived`: `isArchived = true OR importSource = 'whatsapp'`
2. Add auto-archive logic in recordings query:
   - Fetch user's autoArchiveDays setting
   - For current tab, auto-archive recordings older than threshold
3. Add `recordings.archive` procedure
4. Add `recordings.unarchive` procedure
5. Extend response to include senderId, senderName, isArchived, archivedAt, importedAt, importedByName

**Verification:** Test with different tab values, verify auto-archive works

---

## Task 5: API - Import with Sender Mappings

**Scope:** API layer  
**Depends on:** Task 1, Task 3  
**Files:**

- `packages/api/src/routers/import.ts` - Extend import endpoint
- `packages/api/src/services/import.ts` - Handle sender assignment

**Details:**

1. Extend `POST /import/whatsapp` to accept:
   ```typescript
   {
     senderMappings: Record<string, string>, // externalName → userId
     saveMappings: boolean
   }
   ```
2. When processing each audio file, look up sender from parsed chat
3. Assign `senderId` based on mapping
4. Set `importedAt` and `importedById`
5. If `saveMappings = true`, upsert to sender_mappings table

**Verification:** Import WhatsApp chat with mappings, verify senderId assigned correctly

---

## Task 6: Native - SegmentedControl Component ✅ DONE

**Scope:** UI component  
**Depends on:** Nothing  
**Files:**

- `apps/native/components/ui/SegmentedControl.tsx` - New component

**Details:**
Create iOS-style segmented control with:

- Props: `segments: string[]`, `selectedIndex: number`, `onChange: (index) => void`
- Brand colors (lilac/purple for selected)
- Smooth animated selection indicator
- Use Reanimated for selection animation

**Verification:** Render component in isolation, test selection animation

---

## Task 7: Native - Enhanced AudioCard for Archived ✅ DONE

**Scope:** UI component  
**Depends on:** Nothing  
**Files:**

- `apps/native/components/ui/AudioCard.tsx` - Extend existing

**Details:**
Add optional props for archived display:

- `senderName?: string` - Show below title
- `importSource?: 'app' | 'whatsapp'` - Determine badge style
- `importedAt?: Date` - "Imported Dec 30"
- `importedByName?: string` - "by Michael"

When these props are provided, render:

- Sender name below title
- Source badge (💬 green for WhatsApp, 📦 lilac for app)
- Import info line at bottom

**Verification:** Render card with archived props, verify layout

---

## Task 8: Native - Home Screen Tab Integration

**Scope:** Screen  
**Depends on:** Task 4, Task 6, Task 7  
**Files:**

- `apps/native/app/(app)/(tabs)/home/index.tsx` - Refactor
- `apps/native/features/recordings.ts` - Add tab param to query

**Details:**

1. Add tab state: `'current' | 'archived'`
2. Add SegmentedControl below header
3. Update recordings query to pass tab param
4. For Current tab: existing card display
5. For Archived tab: enhanced card with sender/import info
6. Update filter pills per tab:
   - Current: Today, This Week, All Time
   - Archived: All, From Me, From Partner
7. Add swipe/long-press action to archive recordings (Current tab only)

**Verification:** Switch tabs, verify correct recordings display, test archive action

---

## Task 9: Native - Sender Mapping Screen

**Scope:** Screen  
**Depends on:** Task 2, Task 3  
**Files:**

- `apps/native/app/(app)/import-mapping.tsx` - New screen
- `apps/native/features/import.ts` - Add mapping state/logic

**Details:**

1. Create screen that receives parsed sender names as params
2. Fetch all users from API
3. Fetch saved mappings to pre-fill
4. For each sender name, show dropdown of users
5. "Remember this mapping" checkbox per sender
6. "Continue Import" button triggers import with mappings
7. Navigate to Archived tab on success

**Verification:** Navigate to screen with mock data, test mapping flow

---

## Task 10: Native - Import Flow Integration

**Scope:** Feature integration  
**Depends on:** Task 5, Task 9  
**Files:**

- `apps/native/app/(app)/import.tsx` - Modify existing
- `apps/native/features/import.ts` - Update mutation

**Details:**

1. After parsing WhatsApp export, extract unique sender names
2. Navigate to import-mapping screen with sender names
3. After mapping complete, call import API with mappings
4. On success, navigate to home with Archived tab selected

**Verification:** Full import flow from file selection to archived display

---

## Task 11: Native - Settings Screen

**Scope:** Screen  
**Depends on:** Task 2, Task 3  
**Files:**

- `apps/native/app/(app)/settings.tsx` - New screen
- `apps/native/features/settings.ts` - New feature for settings mutations
- `apps/native/app/(app)/(tabs)/_layout.tsx` - Add settings tab or header button

**Details:**

1. Create settings screen with:
   - Auto-archive duration picker (Off, 7, 14, 30, 60 days)
   - List of saved sender mappings with delete buttons
2. Fetch/update settings via API
3. Add navigation to settings (gear icon in header or new tab)

**Verification:** Change settings, verify persistence, delete a mapping

---

## Execution Order

**Phase 1 - Foundation (sequential):**

- Task 1: Database Schema

**Phase 2 - API Layer (parallel after Phase 1):**

- Task 2: Users & Settings endpoints
- Task 3: Sender Mappings endpoints
- Task 4: Recordings tab filter
- Task 5: Import with mappings

**Phase 3 - UI Components (parallel, no dependencies):** ✅ DONE

- Task 6: SegmentedControl ✅
- Task 7: Enhanced AudioCard ✅

**Phase 4 - Screens (after Phase 2 & 3):**

- Task 8: Home Screen tabs (depends on 4, 6, 7)
- Task 9: Sender Mapping screen (depends on 2, 3)
- Task 10: Import flow (depends on 5, 9)
- Task 11: Settings screen (depends on 2, 3)
