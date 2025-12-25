# Rêlune - Product Requirements Document (PRD)

**Date**: 2025-01-25
**Status**: Approved
**Scope**: 5-7 Days MVP

## 1. Problem Statement & Vision

**Problem:**
Private voice conversations are currently stored in a WhatsApp group, which presents critical issues:
- No long-term archiving guarantees (account loss, number disconnection)
- No search, organization, or transcription capabilities
- Manual note-taking is impractical
- Data ownership is not guaranteed

**Solution - Rêlune:**
A privacy-first iOS app exclusively for two users to securely record, transcribe, archive, and search voice memories. The name evokes the intimate, reflective nature of moonlit conversations.

**Core Principles:**
- **Privacy by design** - Face ID, restricted access, no analytics
- **Data ownership** - Private cloud storage under user control
- **Simplicity** - Minimal UI, focus on recording and retrieval
- **Bilingual** - English & French transcription support
- **Permanence** - Built for decades of memories, not ephemeral messaging

**Target Users:**
Two specific users only. No user registration, no social features, no public access. Access controlled by email whitelist.

## 2. User Personas & User Stories

### 2.1 User Persona

**Primary Users:** Two specific individuals (you and your partner/co-user)

| Attribute | Description |
|-----------|-------------|
| **Who** | Two private users sharing intimate voice memories |
| **Context** | Recording personal conversations, reflections, shared moments |
| **Frequency** | Daily to weekly recordings |
| **Environment** | Mobile (iOS), private settings |
| **Needs** | Security, permanence, searchability, bilingual support |
| **Frustrations** | WhatsApp data loss risk, no search, no transcripts |

### 2.2 Core User Stories

#### Primary User Flow: Recording
```
1. User opens app → Face ID/Touch ID authentication required
2. User taps record button → Recording begins with visual indicator
3. User taps stop → Recording ends
4. System processes:
   ├── Audio saved securely (.m4a)
   ├── Automatic transcription (EN/FR detection)
   └── Automatic keyword/tag generation
5. Recording appears in timeline showing:
   ├── Date & time (editable)
   ├── Transcript preview
   └── Keywords (editable)
```

#### Secondary User Flow: Discovery
```
1. User searches by keyword → Results filtered
2. User taps result → Opens recording detail
3. User can:
   ├── Play audio
   ├── Read full transcript
   ├── Edit date/time
   └── Edit keywords
```

#### Import Flow: WhatsApp Migration
```
1. User exports WhatsApp chat with media (outside app)
2. User opens Rêlune → Taps "Import"
3. User picks exported folder via iOS file picker
4. System processes each voice note:
   ├── Extracts original timestamp
   ├── Identifies sender (ownership)
   ├── Checks for duplicates (skip if exists)
   ├── Transcribes audio (EN/FR)
   └── Generates keywords
5. Imported recordings appear in timeline with original dates
```

## 3. Feature Requirements (MoSCoW Prioritization)

### Must Have (P0) - MVP for 5-7 day scope

| ID | Feature | Description |
|----|---------|-------------|
| M1 | Face ID/Touch ID Lock | App requires biometric auth on every open |
| M2 | Voice Recording | Record audio in .m4a format |
| M3 | Audio Playback | Play back recordings with seek/pause |
| M4 | Secure Cloud Upload | Upload to private storage (Supabase) |
| M5 | Automatic Transcription | EN/FR transcription via Whisper or similar |
| M6 | Auto Keyword Generation | Extract keywords/tags from transcript |
| M7 | Timeline View | Chronological list with date, preview, keywords |
| M8 | Keyword Search | Full-text search across transcripts & tags |
| M9 | Editable Metadata | Edit date/time and keywords per recording |
| M10 | Email Whitelist Access | Only 2 specific emails can authenticate |

### Should Have (P1) - Target for MVP if time allows

| ID | Feature | Description |
|----|---------|-------------|
| S1 | WhatsApp Import | Import voice notes from exported folder |
| S2 | Duplicate Detection | Skip already-imported recordings |
| S3 | Ownership Tracking | Track which user created each recording |
| S4 | Transcript Full View | Dedicated screen to read full transcript |

### Could Have (P2) - Post-MVP

| ID | Feature | Description |
|----|---------|-------------|
| C1 | Offline Recording | Record when offline, sync when online |
| C2 | Audio Waveform | Visual waveform during playback |
| C3 | Export Backup | Export all data to local backup |
| C4 | Language Detection | Auto-detect EN vs FR per recording |

### Won't Have (Out of Scope)

| Feature | Reason |
|---------|--------|
| User registration/signup | Fixed 2-user system |
| Social/sharing features | Private app only |
| Analytics/tracking | Privacy-first |
| Android support | iOS only for now |
| Real-time sync between users | Async timeline is sufficient |
| Push notifications | Not needed for this use case |

## 4. Technical Architecture

### 4.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    iOS App (Expo/React Native)                  │
│  ┌──────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐│
│  │ expo-local-  │  │ expo-    │  │ Timeline │  │ Search &     ││
│  │ authentication│  │ audio    │  │   View   │  │ Player       ││
│  └──────────────┘  └──────────┘  └──────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Elysia API Server (Bun)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│
│  │   Auth   │  │ Recordings│ │ Import   │  │  Vercel AI SDK   ││
│  │ Middleware│  │   CRUD   │  │ Handler  │  │ (transcribe)     ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│  Supabase Auth   │ │  Supabase DB     │ │  Supabase Storage    │
│  (Email whitelist)│ │  (Postgres)      │ │  (Private bucket)    │
└──────────────────┘ └──────────────────┘ └──────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Vercel AI SDK - Transcription Providers            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│
│  │ OpenAI   │  │  Groq    │  │ Deepgram │  │    (swappable)   ││
│  │ Whisper  │  │ Whisper  │  │  nova-2  │  │                  ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Mobile** | React Native + Expo 54 | Already bootstrapped, rapid iOS dev |
| **Audio** | `expo-audio` | Modern replacement for deprecated expo-av |
| **Backend** | Elysia + Bun | Already bootstrapped, fast, TypeScript |
| **Database** | Supabase (Postgres + Drizzle) | Already configured, RLS for security |
| **Storage** | Supabase Storage | Private buckets, integrated auth |
| **Auth** | Supabase Auth | Email whitelist, simple setup |
| **AI SDK** | Vercel AI SDK | Provider-agnostic, easy to switch models |
| **Transcription** | Groq Whisper (default) | Fast, cheap (~$0.0001/min), EN/FR support |
| **Keywords** | GPT-4o-mini via AI SDK | Extract keywords from transcript |

### 4.3 Key Libraries

**Mobile (apps/native):**
```
expo-local-authentication  - Face ID/Touch ID
expo-audio                 - Recording & playback (replaces expo-av)
expo-document-picker       - WhatsApp import file picker  
expo-secure-store          - Secure token storage
@supabase/supabase-js      - Supabase client
@tanstack/react-query      - Data fetching/caching
@elysiajs/eden             - Type-safe API client
```

**Backend (apps/server):**
```
ai                         - Vercel AI SDK core
@ai-sdk/openai             - OpenAI provider (Whisper, GPT)
@ai-sdk/groq               - Groq provider (fast Whisper)
@supabase/supabase-js      - Admin client for storage/DB
elysia                     - API framework
```

## 5. Data Model & API Design

### 5.1 Database Schema (Drizzle with Enums)

```typescript
// packages/db/src/schema/index.ts

import { pgTable, pgEnum, uuid, text, integer, boolean, timestamp, primaryKey } from 'drizzle-orm/pg-core';

// Enums
export const languageEnum = pgEnum('language', ['en', 'fr', 'mixed']);
export const importSourceEnum = pgEnum('import_source', ['app', 'whatsapp']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Recordings table
export const recordings = pgTable('recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  
  audioUrl: text('audio_url').notNull(),
  durationSeconds: integer('duration_seconds'),
  fileSizeBytes: integer('file_size_bytes'),
  
  transcript: text('transcript'),
  language: languageEnum('language'),
  
  recordedAt: timestamp('recorded_at').notNull(),
  
  importSource: importSourceEnum('import_source').default('app').notNull(),
  originalFilename: text('original_filename'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Keywords table
export const keywords = pgTable('keywords', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Junction table
export const recordingKeywords = pgTable('recording_keywords', {
  recordingId: uuid('recording_id').notNull().references(() => recordings.id, { onDelete: 'cascade' }),
  keywordId: uuid('keyword_id').notNull().references(() => keywords.id, { onDelete: 'cascade' }),
  isAutoGenerated: boolean('is_auto_generated').default(true).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.recordingId, t.keywordId] }),
}));
```

### 5.2 Client Data Fetching (queryOptions pattern)

```typescript
// apps/native/lib/api.ts
import { treaty } from '@elysiajs/eden';
import type { App } from 'server';

export const api = treaty<App>(process.env.EXPO_PUBLIC_API_URL!);

// apps/native/lib/queries/recordings.ts
import { queryOptions } from '@tanstack/react-query';
import { api } from '../api';

export const recordingsQueryOptions = (search?: string) =>
  queryOptions({
    queryKey: ['recordings', { search }],
    queryFn: async () => {
      const { data, error } = await api.recordings.get({ query: { search } });
      if (error) throw error;
      return data;
    },
  });

export const recordingQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['recordings', id],
    queryFn: async () => {
      const { data, error } = await api.recordings({ id }).get();
      if (error) throw error;
      return data;
    },
  });
```

## 6. Security & Privacy Requirements

### 6.1 Authentication & Authorization

| Requirement | Implementation |
|-------------|----------------|
| **Biometric Lock** | `expo-local-authentication` - Face ID/Touch ID required on every app open |
| **Email Whitelist** | Only 2 specific emails can authenticate (hardcoded or env config) |
| **Auth Provider** | Supabase Auth with magic link or password (no social logins) |
| **Session Management** | JWT stored in `expo-secure-store`, auto-refresh |
| **API Protection** | Every endpoint validates Supabase JWT + checks email whitelist |

### 6.2 Data Security

| Layer | Security Measure |
|-------|------------------|
| **In Transit** | HTTPS/TLS 1.3 for all API calls |
| **At Rest (Device)** | Tokens in Secure Store, no local audio caching |
| **At Rest (Server)** | Supabase Storage with private bucket (no public URLs) |
| **Audio Access** | Signed URLs with short expiry (e.g., 1 hour) |
| **Database** | Supabase RLS policies - users can only access their own data |

### 6.3 Row Level Security (RLS) Policies

```sql
-- Users can only see their own recordings
CREATE POLICY "Users can view own recordings"
ON recordings FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert their own recordings
CREATE POLICY "Users can insert own recordings"
ON recordings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own recordings
CREATE POLICY "Users can update own recordings"
ON recordings FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own recordings
CREATE POLICY "Users can delete own recordings"
ON recordings FOR DELETE
USING (auth.uid() = user_id);
```

### 6.4 Privacy Principles

| Principle | Implementation |
|-----------|----------------|
| **No Analytics** | Zero tracking, no third-party analytics SDKs |
| **No Telemetry** | No crash reporting or usage metrics |
| **Data Ownership** | All data stored in user-controlled Supabase project |
| **Minimal Permissions** | Only microphone + Face ID permissions requested |
| **No Background Access** | App does not run in background or access location |

## 7. UI/UX Flow & Design

### 7.1 Brand Colors

```
Primary Palette (warm, intimate, moonlit):
┌─────────────────────────────────────────────────────────┐
│ #fbebe1  │ #f5e3df  │ #ecd6dd  │ #e2c4d7  │ #d4aecd  │ #c18ed8 │
│ Cream    │ Blush    │ Rose     │ Mauve    │ Orchid   │ Violet  │
│ (bg)     │ (card)   │ (border) │ (accent) │ (active) │ (primary)│
└─────────────────────────────────────────────────────────┘
```

### 7.2 Screen Map

```
┌─────────────────────────────────────────────────────────────┐
│                       APP SCREENS                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐               │
│  │  Lock   │ ──▶ │  Login  │ ──▶ │ Timeline│               │
│  │ (FaceID)│     │ (Email) │     │  (Home) │               │
│  └─────────┘     └─────────┘     └────┬────┘               │
│                                       │                     │
│                    ┌──────────────────┼──────────────────┐  │
│                    │                  │                  │  │
│               ┌────▼────┐       ┌─────▼─────┐     ┌──────▼──┐
│               │ Record  │       │ Recording │     │ Search  │
│               │ (Modal) │       │  Detail   │     │ Results │
│               └─────────┘       └───────────┘     └─────────┘
│                                                             │
│  ┌─────────┐                                               │
│  │ Import  │  (accessed from Timeline menu)                │
│  │ (Modal) │                                               │
│  └─────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

## 8. Implementation Tasks & Timeline

### 8.1 Development Phases (5-7 Days)

```
Day 1-2: Foundation
├── Backend setup (auth, DB schema, storage)
├── Mobile auth flow (Face ID + Supabase)
└── Project structure & dependencies

Day 3-4: Core Recording
├── Audio recording (expo-audio)
├── Upload to Supabase Storage
├── Transcription pipeline (AI SDK)
├── Keyword extraction
└── Timeline UI

Day 5-6: Features & Polish
├── Search functionality
├── Recording detail view
├── Edit date/keywords
├── Audio playback with controls
└── UI polish with brand colors

Day 7: Testing & Import (Stretch)
├── End-to-end testing
├── WhatsApp import (if time allows)
└── Bug fixes & deployment prep
```

### 8.2 Detailed Task Breakdown

#### Phase 1: Foundation (Day 1-2)

| Task | Est. | Priority |
|------|------|----------|
| **Backend** | | |
| Set up Supabase project (DB, Storage, Auth) | 2h | P0 |
| Configure email whitelist in Supabase Auth | 0.5h | P0 |
| Create DB schema with Drizzle migrations | 2h | P0 |
| Set up RLS policies | 1h | P0 |
| Create private storage bucket with policies | 0.5h | P0 |
| Add AI SDK + Groq provider to server | 1h | P0 |
| Implement auth middleware for Elysia | 1h | P0 |
| **Mobile** | | |
| Install dependencies (expo-audio, expo-local-authentication, etc.) | 1h | P0 |
| Set up TanStack Query + Eden Treaty client | 1h | P0 |
| Implement Face ID/Touch ID gate | 2h | P0 |
| Create login screen with Supabase Auth | 2h | P0 |
| Set up Expo Router structure | 1h | P0 |

#### Phase 2: Core Recording (Day 3-4)

| Task | Est. | Priority |
|------|------|----------|
| **Backend** | | |
| `POST /recordings` - upload audio to storage | 2h | P0 |
| Transcription service with AI SDK | 2h | P0 |
| Keyword extraction with GPT-4o-mini | 1.5h | P0 |
| `GET /recordings` - list with pagination | 1h | P0 |
| `GET /recordings/:id` - single recording | 0.5h | P0 |
| Signed URL generation for audio playback | 1h | P0 |
| **Mobile** | | |
| Record screen with expo-audio | 3h | P0 |
| Upload recording mutation | 1h | P0 |
| Timeline screen with recordings list | 3h | P0 |
| Loading/processing states | 1h | P0 |

#### Phase 3: Features & Polish (Day 5-6)

| Task | Est. | Priority |
|------|------|----------|
| **Backend** | | |
| `GET /search` - full-text search endpoint | 2h | P0 |
| `PATCH /recordings/:id` - update date/keywords | 1h | P0 |
| `DELETE /recordings/:id` - delete with storage cleanup | 1h | P1 |
| **Mobile** | | |
| Recording detail screen | 2h | P0 |
| Audio player component with seek/play/pause | 2h | P0 |
| Search screen with results | 2h | P0 |
| Edit date/time modal | 1.5h | P0 |
| Edit keywords (add/remove chips) | 1.5h | P0 |
| Apply brand colors & typography | 2h | P1 |
| Empty states & error handling | 1h | P1 |

#### Phase 4: Testing & Stretch (Day 7)

| Task | Est. | Priority |
|------|------|----------|
| End-to-end flow testing on device | 2h | P0 |
| Fix critical bugs | 2h | P0 |
| **Stretch: WhatsApp Import** | | |
| `POST /import/whatsapp` endpoint | 2h | P1 |
| WhatsApp folder parser (extract .opus files) | 2h | P1 |
| Duplicate detection logic | 1h | P1 |
| Import UI screen | 1.5h | P1 |

## 9. Success Metrics & Risks

### 9.1 MVP Success Criteria

| Criteria | Target | Measurement |
|----------|--------|-------------|
| Core flow works | 100% | Can record → transcribe → search → play |
| Auth secure | 100% | Only 2 whitelisted emails can access |
| Transcription accuracy | >90% | Spot-check EN/FR transcripts |
| App responsiveness | <2s | Timeline loads under 2 seconds |
| Audio quality | Good | .m4a playback is clear |

### 9.2 Post-MVP Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Recordings created | 50+ | First month |
| Search usage | Regular | Weekly searches |
| Data retention | 100% | Zero data loss |
| WhatsApp import | Complete | All historical voice notes migrated |

### 9.3 Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Transcription accuracy poor for mixed EN/FR | Medium | Medium | Test with real samples early; consider language detection |
| Expo-audio issues on iOS | Low | High | Test on real device Day 1; have expo-av as fallback |
| Supabase Storage signed URL expiry | Low | Medium | Refresh URLs on playback; generous expiry (1hr) |
| 7-day timeline too aggressive | Medium | Medium | WhatsApp import is stretch goal; focus on core first |
| AI costs exceed budget | Low | Low | Groq is very cheap; monitor usage |
