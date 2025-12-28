# Elysia + Eden Treaty → oRPC Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate from Elysia controllers + Eden Treaty to oRPC for end-to-end type-safe RPC communication between server and native app.

**Architecture:** All business logic moves to `packages/api/` as oRPC routers with Zod validation. The server (`apps/server/`) becomes a thin Elysia wrapper that mounts the oRPC handler. Native app uses oRPC client with TanStack Query integration.

**Tech Stack:** oRPC, Zod, TanStack Query, Supabase Auth, Drizzle ORM

---

## Current State

```
packages/api/           # oRPC package (partially set up)
├── src/
│   ├── index.ts        # Base procedure with Context
│   ├── context.ts      # Creates context (currently returns { session: null })
│   └── routers/
│       ├── index.ts    # appRouter with healthCheck + todo
│       └── todo.ts     # Working todo CRUD example

apps/server/            # Elysia server
├── src/
│   ├── index.ts        # Mounts oRPC at /rpc (Elysia modules NOT mounted)
│   ├── modules/        # Elysia controllers (implemented but unreachable)
│   │   ├── auth/       # Auth middleware + controller
│   │   ├── recordings/ # CRUD + transcription
│   │   └── import/     # WhatsApp import
│   └── shared/         # Storage, errors, audio-converter

apps/native/            # React Native app
├── lib/
│   └── api.ts          # Both oRPC and Eden clients (Eden broken - no App type)
├── queries/            # React Query options (using Eden)
├── features/           # Mutations (using Eden)
└── stores/             # Zustand stores
```

## Target State

```
packages/api/           # oRPC package (complete)
├── src/
│   ├── index.ts        # Base + protected procedures
│   ├── context.ts      # Context with headers + user
│   ├── middleware/
│   │   └── auth.ts     # Supabase token validation middleware
│   ├── services/       # Business logic (moved from server)
│   │   ├── recordings.ts
│   │   ├── import.ts
│   │   ├── storage.ts
│   │   └── audio-converter.ts
│   ├── routers/
│   │   ├── index.ts    # appRouter with all routers
│   │   ├── recordings.ts
│   │   └── import.ts
│   └── models/         # Zod schemas
│       ├── recordings.ts
│       └── import.ts

apps/server/            # Thin Elysia wrapper
├── src/
│   ├── index.ts        # Just mounts oRPC handler
│   └── supabase.ts     # Supabase client (for auth)

apps/native/            # React Native app
├── lib/
│   └── api.ts          # oRPC client only (Eden removed)
├── queries/            # Using orpc.*.queryOptions()
└── features/           # Using orpc.*.mutationOptions()
```

---

## Task 1: Move Shared Utilities to packages/api

**Files:**
- Create: `packages/api/src/services/storage.ts`
- Create: `packages/api/src/services/audio-converter.ts`
- Create: `packages/api/src/services/supabase.ts`

**Step 1: Create Supabase client in packages/api**

```typescript
// packages/api/src/services/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { env } from "@relune/env";

/**
 * Server-side Supabase client for auth validation and storage operations.
 * Uses service role key for admin operations.
 */
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);

/**
 * Validate a Supabase access token and return user info.
 * Used by auth middleware to verify Bearer tokens.
 */
export async function validateToken(token: string): Promise<{
  user: { id: string; email?: string } | null;
  error: Error | null;
}> {
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { user: null, error: error ?? new Error("Invalid token") };
  }

  return {
    user: { id: data.user.id, email: data.user.email },
    error: null,
  };
}
```

**Step 2: Copy storage utilities**

```typescript
// packages/api/src/services/storage.ts
import { randomUUID } from "node:crypto";
import { supabase } from "./supabase";

/**
 * Shared storage utilities for uploading files to Supabase Storage
 */

/**
 * Get MIME type from filename extension
 */
export function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  const types: Record<string, string> = {
    opus: "audio/opus",
    m4a: "audio/mp4",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    webm: "audio/webm",
  };
  return types[ext || ""] || "audio/mpeg";
}

/**
 * Upload audio file to Supabase Storage
 * Returns the public URL of the uploaded file
 */
export async function uploadAudioToStorage(
  filename: string,
  fileContent: Uint8Array,
  contentType: string,
): Promise<{ url: string; error: string | null }> {
  const storagePath = `recordings/${randomUUID()}-${filename}`;

  const { error } = await supabase.storage
    .from("audio")
    .upload(storagePath, fileContent, {
      contentType,
      upsert: false,
    });

  if (error) {
    return { url: "", error: error.message };
  }

  const { data } = supabase.storage.from("audio").getPublicUrl(storagePath);

  return { url: data.publicUrl, error: null };
}

/**
 * Delete audio file from Supabase Storage by parsing the public URL
 */
export async function deleteAudioFromStorage(
  audioUrl: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const url = new URL(audioUrl);
    const pathParts = url.pathname.split("/");

    const audioBucketIndex = pathParts.indexOf("audio");
    if (audioBucketIndex === -1 || audioBucketIndex === pathParts.length - 1) {
      return {
        success: false,
        error: "Invalid audio URL: could not extract storage path",
      };
    }

    const storagePath = pathParts.slice(audioBucketIndex + 1).join("/");

    const { error } = await supabase.storage
      .from("audio")
      .remove([storagePath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Failed to parse audio URL: ${message}` };
  }
}
```

**Step 3: Copy audio converter**

```typescript
// packages/api/src/services/audio-converter.ts
import { Decoder, Demuxer, Encoder, Muxer } from "node-av/api";
import { FF_ENCODER_AAC } from "node-av/constants";

/**
 * Audio conversion utilities using node-av (native FFmpeg bindings)
 * Converts various audio formats to m4a (AAC) for iOS compatibility
 */

const SUPPORTED_INPUT_EXTENSIONS = [".opus", ".ogg", ".wav", ".mp3", ".webm"];
const OUTPUT_EXTENSION = ".m4a";

export class AudioConversionError extends Error {
  constructor(
    message: string,
    public readonly code: "CONVERSION_FAILED" | "NO_AUDIO_STREAM",
  ) {
    super(message);
    this.name = "AudioConversionError";
  }
}

/**
 * Check if a file needs conversion based on its extension
 */
export function needsConversion(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return SUPPORTED_INPUT_EXTENSIONS.includes(ext);
}

/**
 * Get the output filename with .m4a extension
 */
export function getM4aFilename(originalFilename: string): string {
  const lastDot = originalFilename.lastIndexOf(".");
  const baseName =
    lastDot > 0 ? originalFilename.slice(0, lastDot) : originalFilename;
  return `${baseName}${OUTPUT_EXTENSION}`;
}

export type ConversionResult = {
  data: Uint8Array;
  filename: string;
};

/**
 * Convert audio file to m4a format using node-av (native FFmpeg bindings)
 */
export async function convertToM4a(
  input: Uint8Array<ArrayBufferLike>,
  originalFilename: string,
): Promise<ConversionResult> {
  if (originalFilename.toLowerCase().endsWith(".m4a")) {
    return { data: input, filename: originalFilename };
  }

  let demuxer: Demuxer | null = null;
  let decoder: Decoder | null = null;
  let muxer: Muxer | null = null;

  try {
    demuxer = await Demuxer.open(Buffer.from(input));

    const audioStream = demuxer.audio();
    if (!audioStream) {
      throw new AudioConversionError(
        "No audio stream found in input file",
        "NO_AUDIO_STREAM",
      );
    }

    decoder = await Decoder.create(audioStream);

    const encoder = await Encoder.create(FF_ENCODER_AAC, {
      decoder,
      bitrate: "128k",
    });

    const chunks: Buffer[] = [];
    muxer = await Muxer.open(
      {
        write: (buffer: Buffer) => {
          chunks.push(Buffer.from(buffer));
          return buffer.length;
        },
        seek: (offset: bigint) => offset,
      },
      {
        format: "ipod",
        options: {
          movflags: "frag_keyframe+empty_moov+default_base_moof",
        },
      },
    );

    const outputIndex = muxer.addStream(encoder, {
      inputStream: audioStream,
    });

    for await (const packet of demuxer.packets(audioStream.index)) {
      for await (const frame of decoder.frames(packet)) {
        for await (const encodedPacket of encoder.packets(frame)) {
          await muxer.writePacket(encodedPacket, outputIndex);
        }
      }
    }

    const flushResult = encoder.flushPackets();
    if (
      flushResult &&
      typeof flushResult[Symbol.asyncIterator] === "function"
    ) {
      for await (const packet of flushResult) {
        await muxer.writePacket(packet, outputIndex);
      }
    }

    await muxer.close();
    muxer = null;

    return {
      data: new Uint8Array(Buffer.concat(chunks)),
      filename: getM4aFilename(originalFilename),
    };
  } catch (error) {
    if (error instanceof AudioConversionError) {
      throw error;
    }
    throw new AudioConversionError(
      `Conversion failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "CONVERSION_FAILED",
    );
  } finally {
    try {
      decoder?.close();
    } catch {
      // ignore cleanup errors
    }

    try {
      await demuxer?.close();
    } catch {
      // ignore cleanup errors
    }

    try {
      await muxer?.close();
    } catch {
      // ignore cleanup errors
    }
  }
}
```

**Step 4: Update packages/api/package.json dependencies**

Add required dependencies:
- `@supabase/supabase-js`
- `node-av` (for audio conversion)
- `ai` and `@ai-sdk/openai` (for transcription)

**Step 5: Verify build**

Run: `bun turbo build --filter=@relune/api`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add packages/api/src/services/
git commit -m "feat(api): add shared services for storage, audio conversion, and supabase"
```

---

## Task 2: Create Auth Middleware for oRPC

**Files:**
- Create: `packages/api/src/middleware/auth.ts`
- Modify: `packages/api/src/index.ts`
- Modify: `packages/api/src/context.ts`

**Step 1: Update context to include headers**

```typescript
// packages/api/src/context.ts
import { db } from "@relune/db";
import { users } from "@relune/db/schema";
import { eq } from "drizzle-orm";
import { validateToken } from "./services/supabase";

/**
 * Base context available to all procedures.
 * Contains headers for auth extraction.
 */
export type BaseContext = {
  headers: Headers;
};

/**
 * Authenticated user info derived by auth middleware.
 */
export type AuthUser = {
  id: string;
  email?: string;
};

/**
 * Context after auth middleware has run.
 * User is guaranteed to be present.
 */
export type AuthenticatedContext = BaseContext & {
  user: AuthUser;
};

/**
 * Create base context from request headers.
 * Called by the server for each request.
 */
export function createContext(headers: Headers): BaseContext {
  return { headers };
}

export type Context = BaseContext;

/**
 * Ensure user exists in the public.users table.
 * Creates the user row if it doesn't exist (just-in-time provisioning).
 */
export async function ensureUserExists(user: AuthUser): Promise<void> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(users).values({
      id: user.id,
      email: user.email ?? "",
    });
  }
}

/**
 * Validate token and return user.
 * Re-exported for use in auth middleware.
 */
export { validateToken };
```

**Step 2: Create auth middleware**

```typescript
// packages/api/src/middleware/auth.ts
import { ORPCError, os } from "@orpc/server";
import type { BaseContext, AuthUser, AuthenticatedContext } from "../context";
import { validateToken, ensureUserExists } from "../context";

/**
 * Configuration for auth middleware.
 */
export type AuthMiddlewareConfig = {
  /** List of allowed email addresses. If empty, all authenticated users are allowed. */
  allowedEmails?: string[];
};

/**
 * Normalize email for comparison (lowercase, trimmed).
 */
function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

/**
 * Extract Bearer token from Authorization header.
 */
function extractBearerToken(headers: Headers): string | null {
  const authHeader = headers.get("Authorization");
  if (!authHeader) return null;

  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!bearerMatch) return null;

  return bearerMatch[1]?.trim() || null;
}

/**
 * Auth middleware that validates Supabase Bearer tokens.
 * 
 * Extracts the token from Authorization header, validates with Supabase,
 * and adds the authenticated user to context.
 * 
 * @throws ORPCError with code "UNAUTHORIZED" if token is missing or invalid
 * @throws ORPCError with code "FORBIDDEN" if user email is not in allowlist
 * 
 * @example
 * ```typescript
 * const protectedProcedure = publicProcedure.use(authMiddleware());
 * 
 * // With email allowlist
 * const adminProcedure = publicProcedure.use(authMiddleware({
 *   allowedEmails: ["admin@example.com"]
 * }));
 * ```
 */
export function authMiddleware(config: AuthMiddlewareConfig = {}) {
  const { allowedEmails = [] } = config;
  const whitelist = allowedEmails
    .map((email) => normalizeEmail(email))
    .filter((email): email is string => Boolean(email));

  return os
    .$context<BaseContext>()
    .middleware(async ({ context, next }) => {
      const token = extractBearerToken(context.headers);

      if (!token) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "No authorization header or invalid Bearer token format",
          data: { code: "MISSING_TOKEN" },
        });
      }

      const { user, error } = await validateToken(token);

      if (error || !user) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Invalid token",
          data: { code: "INVALID_TOKEN" },
        });
      }

      // Check email allowlist if configured
      if (whitelist.length > 0) {
        const userEmail = normalizeEmail(user.email);
        if (!userEmail || !whitelist.includes(userEmail)) {
          throw new ORPCError("FORBIDDEN", {
            message: "Email not authorized",
            data: { code: "EMAIL_NOT_ALLOWED" },
          });
        }
      }

      // Ensure user exists in public.users table (just-in-time provisioning)
      await ensureUserExists(user);

      return next({
        context: { user } as { user: AuthUser },
      });
    });
}
```

**Step 3: Update base procedures**

```typescript
// packages/api/src/index.ts
import { os } from "@orpc/server";
import type { Context, AuthenticatedContext, AuthUser } from "./context";
import { authMiddleware } from "./middleware/auth";

/**
 * Base oRPC instance with context type.
 * All procedures start from here.
 */
export const o = os.$context<Context>();

/**
 * Public procedure - no authentication required.
 * Use for health checks, public data, etc.
 * 
 * @example
 * ```typescript
 * const healthCheck = publicProcedure.handler(() => "OK");
 * ```
 */
export const publicProcedure = o;

/**
 * Protected procedure - requires valid Supabase Bearer token.
 * User is guaranteed to be present in context.
 * 
 * @example
 * ```typescript
 * const getProfile = protectedProcedure.handler(({ context }) => {
 *   return getUserById(context.user.id);
 * });
 * ```
 */
export const protectedProcedure = o.use(authMiddleware());

// Re-export types for use in routers
export type { Context, AuthenticatedContext, AuthUser };
```

**Step 4: Verify build**

Run: `bun turbo build --filter=@relune/api`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add packages/api/src/
git commit -m "feat(api): add auth middleware with Supabase token validation"
```

---

## Task 3: Move Recordings Service to packages/api

**Files:**
- Create: `packages/api/src/services/recordings.ts`

**Step 1: Copy recordings service with oRPC error handling**

```typescript
// packages/api/src/services/recordings.ts
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@relune/db";
import type { Recording } from "@relune/db/schema";
import { keywords, recordingKeywords, recordings } from "@relune/db/schema";
import { env } from "@relune/env";
import { generateText } from "ai";
import { ORPCError } from "@orpc/server";
import {
  and,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNull,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { convertToM4a, needsConversion } from "./audio-converter";
import {
  deleteAudioFromStorage,
  getContentType,
  uploadAudioToStorage,
} from "./storage";

/**
 * Recordings service - business logic for audio recordings.
 * 
 * All functions throw ORPCError for error cases:
 * - NOT_FOUND: Recording doesn't exist
 * - FORBIDDEN: User not authorized (reserved for future multi-user)
 * - BAD_REQUEST: Invalid input or operation failed
 */

// Initialize OpenAI provider for keyword generation
const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// ============================================================================
// Types
// ============================================================================

export type RecordingKeywordItem = {
  id: string;
  name: string;
};

export type RecordingWithKeywords = Recording & {
  keywords: RecordingKeywordItem[];
};

export type ListRecordingsInput = {
  limit?: number;
  offset?: number;
  search?: string;
};

export type CreateRecordingInput = {
  userId: string;
  file: string; // base64-encoded audio data
  filename: string;
  durationSeconds?: number;
  recordedAt?: Date;
};

export type UpdateRecordingInput = {
  id: string;
  recordedAt?: Date;
  keywords?: string[];
};

export type ProcessPendingResult = {
  processed: number;
  remaining: number;
  errors: Array<{ id: string; error: string }>;
};

// ============================================================================
// List Recordings
// ============================================================================

/**
 * List recordings with optional search and pagination.
 * Searches across transcript, filename, and keywords.
 */
export async function listRecordings({
  limit = 20,
  offset = 0,
  search,
}: ListRecordingsInput): Promise<RecordingWithKeywords[]> {
  const whereCondition: SQL[] = [];

  if (search?.trim()) {
    const searchTerm = `%${search.trim()}%`;

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

    whereCondition.push(ilike(recordings.transcript, searchTerm));
    whereCondition.push(ilike(recordings.originalFilename, searchTerm));
    whereCondition.push(exists(keywordMatch));
  }

  const recordingResults = await db
    .select()
    .from(recordings)
    .where(or(...whereCondition))
    .orderBy(desc(recordings.recordedAt))
    .limit(limit)
    .offset(offset);

  if (recordingResults.length === 0) {
    return [];
  }

  // Batch fetch keywords
  const recordingIds = recordingResults.map((r) => r.id);
  const keywordResults = await db
    .select({
      recordingId: recordingKeywords.recordingId,
      keywordId: keywords.id,
      keywordName: keywords.name,
    })
    .from(recordingKeywords)
    .innerJoin(keywords, eq(recordingKeywords.keywordId, keywords.id))
    .where(inArray(recordingKeywords.recordingId, recordingIds));

  const keywordsByRecording = new Map<string, RecordingKeywordItem[]>();
  for (const kw of keywordResults) {
    const existing = keywordsByRecording.get(kw.recordingId) ?? [];
    existing.push({ id: kw.keywordId, name: kw.keywordName });
    keywordsByRecording.set(kw.recordingId, existing);
  }

  return recordingResults.map((r) => ({
    ...r,
    keywords: keywordsByRecording.get(r.id) ?? [],
  }));
}

// ============================================================================
// Get Recording
// ============================================================================

/**
 * Get a single recording by ID with keywords.
 * 
 * @throws ORPCError NOT_FOUND if recording doesn't exist
 */
export async function getRecording(id: string): Promise<RecordingWithKeywords> {
  const result = await db
    .select()
    .from(recordings)
    .where(eq(recordings.id, id))
    .limit(1);

  const recording = result[0];

  if (!recording) {
    throw new ORPCError("NOT_FOUND", {
      message: "Recording not found",
      data: { code: "RECORDING_NOT_FOUND", id },
    });
  }

  const keywordResults = await db
    .select({
      keywordId: keywords.id,
      keywordName: keywords.name,
    })
    .from(recordingKeywords)
    .innerJoin(keywords, eq(recordingKeywords.keywordId, keywords.id))
    .where(eq(recordingKeywords.recordingId, id));

  return {
    ...recording,
    keywords: keywordResults.map((kw) => ({
      id: kw.keywordId,
      name: kw.keywordName,
    })),
  };
}

// ============================================================================
// Create Recording
// ============================================================================

/**
 * Create a new recording from in-app upload.
 * Handles base64 decoding, format conversion, storage upload, and DB insert.
 * Triggers transcription in background.
 * 
 * @throws ORPCError BAD_REQUEST if upload or creation fails
 */
export async function createRecording({
  userId,
  file,
  filename,
  durationSeconds,
  recordedAt,
}: CreateRecordingInput): Promise<Recording> {
  // Decode base64 file content
  const fileBuffer = Buffer.from(file, "base64");
  const fileContent = new Uint8Array(fileBuffer);

  // Convert to m4a if needed
  let finalContent: Uint8Array<ArrayBufferLike> = fileContent;
  let finalFilename = filename;
  if (needsConversion(filename)) {
    const converted = await convertToM4a(fileContent, filename);
    finalContent = converted.data;
    finalFilename = converted.filename;
  }

  const contentType = getContentType(finalFilename);

  // Upload to storage
  const uploadResult = await uploadAudioToStorage(
    finalFilename,
    finalContent,
    contentType,
  );

  if (uploadResult.error) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Upload failed: ${uploadResult.error}`,
      data: { code: "UPLOAD_FAILED" },
    });
  }

  // Create recording in database
  const result = await db
    .insert(recordings)
    .values({
      userId,
      audioUrl: uploadResult.url,
      durationSeconds: durationSeconds ?? null,
      fileSizeBytes: finalContent.length,
      recordedAt: recordedAt ?? new Date(),
      importSource: "app" as const,
      originalFilename: finalFilename,
    })
    .returning();

  const recording = result[0];
  if (!recording) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Failed to create recording",
      data: { code: "CREATE_FAILED" },
    });
  }

  // Trigger transcription in background (fire-and-forget)
  processRecording(recording).catch((err) =>
    console.error(`Transcription failed for recording ${recording.id}:`, err),
  );

  return recording;
}

// ============================================================================
// Delete Recording
// ============================================================================

/**
 * Delete a recording and its audio file from storage.
 * 
 * @throws ORPCError NOT_FOUND if recording doesn't exist
 * @throws ORPCError BAD_REQUEST if storage deletion fails
 */
export async function deleteRecording(id: string): Promise<{ success: true }> {
  const result = await db
    .select()
    .from(recordings)
    .where(eq(recordings.id, id))
    .limit(1);

  const recording = result[0];

  if (!recording) {
    throw new ORPCError("NOT_FOUND", {
      message: "Recording not found",
      data: { code: "RECORDING_NOT_FOUND", id },
    });
  }

  // Delete from storage
  const storageResult = await deleteAudioFromStorage(recording.audioUrl);
  if (!storageResult.success) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Storage deletion failed: ${storageResult.error}`,
      data: { code: "DELETE_FAILED" },
    });
  }

  // Delete from database (cascade handles recordingKeywords)
  await db.delete(recordings).where(eq(recordings.id, id));

  return { success: true };
}

// ============================================================================
// Update Recording
// ============================================================================

/**
 * Update a recording's metadata (recordedAt, keywords).
 * 
 * @throws ORPCError NOT_FOUND if recording doesn't exist
 */
export async function updateRecording({
  id,
  recordedAt,
  keywords: newKeywords,
}: UpdateRecordingInput): Promise<RecordingWithKeywords> {
  // Verify recording exists
  const existing = await db
    .select()
    .from(recordings)
    .where(eq(recordings.id, id))
    .limit(1);

  if (!existing[0]) {
    throw new ORPCError("NOT_FOUND", {
      message: "Recording not found",
      data: { code: "RECORDING_NOT_FOUND", id },
    });
  }

  // Update recordedAt if provided
  if (recordedAt) {
    await db
      .update(recordings)
      .set({ recordedAt, updatedAt: new Date() })
      .where(eq(recordings.id, id));
  }

  // Replace keywords if provided
  if (newKeywords !== undefined) {
    await db
      .delete(recordingKeywords)
      .where(eq(recordingKeywords.recordingId, id));

    if (newKeywords.length > 0) {
      await saveKeywords(id, newKeywords);
    }
  }

  return getRecording(id);
}

// ============================================================================
// Transcription & Keywords
// ============================================================================

/**
 * Get pending recordings that need transcription.
 */
export async function getPendingRecordings(limit: number): Promise<Recording[]> {
  return await db
    .select()
    .from(recordings)
    .where(isNull(recordings.transcript))
    .orderBy(recordings.createdAt)
    .limit(limit);
}

/**
 * Transcribe audio using OpenAI Whisper API.
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  const audioBlob = await fetch(audioUrl).then((res) => res.blob());

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.m4a");
  formData.append("model", "whisper-1");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI transcription failed: ${response.status} ${error}`);
  }

  const result = (await response.json()) as { text: string };
  return result.text;
}

/**
 * Generate keywords from transcript using GPT-4o-mini.
 */
async function generateKeywords(transcript: string): Promise<string[]> {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Extract 3-5 keywords or key phrases from this transcript. Return only the keywords, one per line, no numbering or bullets.

Transcript:
${transcript}`,
  });

  return text
    .split("\n")
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && k.length < 50);
}

/**
 * Save keywords to database (upsert pattern).
 */
export async function saveKeywords(
  recordingId: string,
  keywordNames: string[],
): Promise<void> {
  for (const name of keywordNames) {
    const existing = await db
      .select()
      .from(keywords)
      .where(eq(keywords.name, name.toLowerCase()))
      .limit(1);

    let keywordId: string;

    if (existing[0]) {
      keywordId = existing[0].id;
    } else {
      const inserted = await db
        .insert(keywords)
        .values({ name: name.toLowerCase() })
        .returning({ id: keywords.id });
      const insertedKeyword = inserted[0];
      if (!insertedKeyword) continue;
      keywordId = insertedKeyword.id;
    }

    await db
      .insert(recordingKeywords)
      .values({
        recordingId,
        keywordId,
        isAutoGenerated: true,
      })
      .onConflictDoNothing();
  }
}

/**
 * Process a single recording: transcribe and generate keywords.
 */
export async function processRecording(
  recording: Recording,
): Promise<{ success: boolean; error?: string }> {
  try {
    const transcript = await transcribeAudio(recording.audioUrl);
    const keywordList = await generateKeywords(transcript);

    await db
      .update(recordings)
      .set({
        transcript,
        updatedAt: new Date(),
      })
      .where(eq(recordings.id, recording.id));

    await saveKeywords(recording.id, keywordList);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Process pending recordings in batch.
 */
export async function processPendingRecordings(
  limit: number,
): Promise<ProcessPendingResult> {
  const pending = await getPendingRecordings(limit);
  const results = await Promise.all(
    pending.map(async (recording) => {
      const result = await processRecording(recording);
      return { id: recording.id, result };
    }),
  );

  const processed = results.reduce(
    (acc, { result }) => acc + (result.success ? 1 : 0),
    0,
  );
  const errors: Array<{ id: string; error: string }> = results
    .filter(({ result }) => !result.success)
    .map(({ id, result }) => ({
      id,
      error: result.error || "Unknown error",
    }));

  const remainingCountResult = await db
    .select({ count: count() })
    .from(recordings)
    .where(isNull(recordings.transcript));
  const remainingCount = remainingCountResult[0]?.count ?? 0;

  return {
    processed,
    remaining: remainingCount,
    errors,
  };
}
```

**Step 2: Verify build**

Run: `bun turbo build --filter=@relune/api`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add packages/api/src/services/recordings.ts
git commit -m "feat(api): move recordings service with oRPC error handling"
```

---

## Task 4: Move Import Service to packages/api

**Files:**
- Create: `packages/api/src/services/import.ts`

**Step 1: Copy import service**

```typescript
// packages/api/src/services/import.ts
import { randomUUID } from "node:crypto";
import { db } from "@relune/db";
import { recordings, users } from "@relune/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * WhatsApp Import Service
 * Parses WhatsApp chat exports and creates recordings
 */

// ============================================================================
// Types
// ============================================================================

export type ParsedAudioMessage = {
  timestamp: Date;
  sender: string;
  filename: string;
  notes: string | null;
};

export type ParseResult = {
  audioMessages: ParsedAudioMessage[];
  errors: string[];
};

export type ImportResult = {
  imported: number;
  skipped: number;
  failed: Array<{ filename: string; error: string }>;
  parseErrors: string[];
  recordings: Array<{ id: string; filename: string }>;
};

// ============================================================================
// Chat Parsing
// ============================================================================

/**
 * Parse WhatsApp _chat.txt format.
 * Format: [MM/DD/YY, HH:MM:SS] Sender: <attached: filename.opus>
 */
export function parseChatTxt(content: string): ParseResult {
  const lines = content.split(/\r?\n/);
  const audioMessages: ParsedAudioMessage[] = [];
  const errors: string[] = [];

  const messagePattern =
    /^\[(\d{1,2}\/\d{1,2}\/\d{2}),\s*(\d{1,2}:\d{2}:\d{2})\]\s*(.+?):\s*(.*)$/;
  const attachmentPattern = /<attached:\s*(.+?)>/;
  const audioExtensions = [".opus", ".m4a", ".mp3", ".wav", ".ogg"];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    const cleanLine = line.replace(/[\u200e\u200f\u202a-\u202e]/g, "");

    const match = cleanLine.match(messagePattern);
    if (!match) continue;

    const [, dateStr, timeStr, sender, messageContent] = match;
    if (!dateStr || !timeStr || !sender || !messageContent) continue;

    const attachmentMatch = messageContent.match(attachmentPattern);
    if (!attachmentMatch) continue;

    const filename = attachmentMatch[1];
    if (!filename) continue;

    const isAudio = audioExtensions.some((ext) =>
      filename.toLowerCase().endsWith(ext),
    );
    if (!isAudio) continue;

    const [month, day, year] = dateStr.split("/").map(Number);
    const [hours, minutes, seconds] = timeStr.split(":").map(Number);

    if (
      month === undefined ||
      day === undefined ||
      year === undefined ||
      hours === undefined ||
      minutes === undefined ||
      seconds === undefined
    ) {
      errors.push(`Invalid date/time format at line ${i + 1}`);
      continue;
    }

    const fullYear = year < 100 ? 2000 + year : year;
    const timestamp = new Date(
      fullYear,
      month - 1,
      day,
      hours,
      minutes,
      seconds,
    );

    if (Number.isNaN(timestamp.getTime())) {
      errors.push(`Invalid timestamp at line ${i + 1}`);
      continue;
    }

    // Look for notes (text message from same sender right after)
    let notes: string | null = null;
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1]
        ?.trim()
        .replace(/[\u200e\u200f\u202a-\u202e]/g, "");
      if (nextLine) {
        const nextMatch = nextLine.match(messagePattern);
        if (nextMatch) {
          const [, , , nextSender, nextContent] = nextMatch;
          if (
            nextSender === sender &&
            nextContent &&
            !nextContent.includes("<attached:")
          ) {
            notes =
              nextContent.replace(/<This message was edited>/g, "").trim() ||
              null;
          }
        }
      }
    }

    audioMessages.push({
      timestamp,
      sender,
      filename,
      notes,
    });
  }

  return { audioMessages, errors };
}

// ============================================================================
// User Management
// ============================================================================

/**
 * Resolve or create a user by display name.
 */
export async function resolveOrCreateUser(displayName: string): Promise<string> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.displayName, displayName))
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const slug = displayName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const userId = randomUUID();

  await db.insert(users).values({
    id: userId,
    email: `${slug}@import.local`,
    displayName,
  });

  return userId;
}

// ============================================================================
// Duplicate Detection
// ============================================================================

/**
 * Check if a recording already exists (by original filename and user).
 */
export async function checkDuplicate(
  userId: string,
  originalFilename: string,
): Promise<boolean> {
  const existing = await db
    .select({ id: recordings.id })
    .from(recordings)
    .where(
      and(
        eq(recordings.userId, userId),
        eq(recordings.originalFilename, originalFilename),
      ),
    )
    .limit(1);

  return existing.length > 0;
}

// ============================================================================
// Recording Creation
// ============================================================================

/**
 * Create a recording record in the database (for WhatsApp imports).
 */
export async function createImportedRecording(data: {
  userId: string;
  audioUrl: string;
  recordedAt: Date;
  originalFilename: string;
  notes: string | null;
  fileSizeBytes?: number;
}): Promise<string> {
  const result = await db
    .insert(recordings)
    .values({
      userId: data.userId,
      audioUrl: data.audioUrl,
      recordedAt: data.recordedAt,
      importSource: "whatsapp",
      originalFilename: data.originalFilename,
      notes: data.notes,
      fileSizeBytes: data.fileSizeBytes,
    })
    .returning({ id: recordings.id });

  const recordingId = result[0]?.id;
  if (!recordingId) {
    throw new Error("Failed to create recording");
  }

  return recordingId;
}
```

**Step 2: Verify build**

Run: `bun turbo build --filter=@relune/api`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add packages/api/src/services/import.ts
git commit -m "feat(api): move import service for WhatsApp chat parsing"
```

---

## Task 5: Create Zod Schemas (Models)

**Files:**
- Create: `packages/api/src/models/recordings.ts`
- Create: `packages/api/src/models/import.ts`

**Step 1: Create recordings schemas**

```typescript
// packages/api/src/models/recordings.ts
import { z } from "zod";

/**
 * Request/response schemas for recordings endpoints.
 * These are the source of truth for API types.
 */

// ============================================================================
// Input Schemas
// ============================================================================

export const listRecordingsInput = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  search: z.string().optional(),
});

export const getRecordingInput = z.object({
  id: z.string().uuid(),
});

export const createRecordingInput = z.object({
  file: z.string().min(1, "File is required"), // base64-encoded audio data
  filename: z.string().min(1, "Filename is required"),
  durationSeconds: z.number().positive().optional(),
  recordedAt: z.string().datetime().optional(), // ISO 8601 string
});

export const updateRecordingInput = z.object({
  id: z.string().uuid(),
  recordedAt: z.string().datetime().optional(),
  keywords: z.array(z.string()).optional(),
});

export const deleteRecordingInput = z.object({
  id: z.string().uuid(),
});

export const processPendingInput = z.object({
  limit: z.number().int().min(1).max(50).optional().default(10),
});

// ============================================================================
// Output Schemas
// ============================================================================

export const keywordSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const recordingSchema = z.object({
  id: z.string(),
  userId: z.string(),
  audioUrl: z.string(),
  transcript: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  fileSizeBytes: z.number().nullable(),
  recordedAt: z.date(),
  language: z.enum(["en", "fr", "mixed"]).nullable(),
  importSource: z.enum(["app", "whatsapp"]),
  originalFilename: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const recordingWithKeywordsSchema = recordingSchema.extend({
  keywords: z.array(keywordSchema),
});

export const processPendingResultSchema = z.object({
  processed: z.number(),
  remaining: z.number(),
  errors: z.array(
    z.object({
      id: z.string(),
      error: z.string(),
    }),
  ),
});

// ============================================================================
// Type Exports
// ============================================================================

export type ListRecordingsInput = z.infer<typeof listRecordingsInput>;
export type GetRecordingInput = z.infer<typeof getRecordingInput>;
export type CreateRecordingInput = z.infer<typeof createRecordingInput>;
export type UpdateRecordingInput = z.infer<typeof updateRecordingInput>;
export type DeleteRecordingInput = z.infer<typeof deleteRecordingInput>;
export type ProcessPendingInput = z.infer<typeof processPendingInput>;

export type Keyword = z.infer<typeof keywordSchema>;
export type Recording = z.infer<typeof recordingSchema>;
export type RecordingWithKeywords = z.infer<typeof recordingWithKeywordsSchema>;
export type ProcessPendingResult = z.infer<typeof processPendingResultSchema>;
```

**Step 2: Create import schemas**

```typescript
// packages/api/src/models/import.ts
import { z } from "zod";

/**
 * Request/response schemas for import endpoints.
 */

// ============================================================================
// Input Schemas
// ============================================================================

export const whatsappImportInput = z.object({
  file: z.string().min(1, "File is required"), // base64-encoded ZIP file
});

// ============================================================================
// Output Schemas
// ============================================================================

export const importResultSchema = z.object({
  imported: z.number(),
  skipped: z.number(),
  failed: z.array(
    z.object({
      filename: z.string(),
      error: z.string(),
    }),
  ),
  parseErrors: z.array(z.string()),
  recordings: z.array(
    z.object({
      id: z.string(),
      filename: z.string(),
    }),
  ),
});

// ============================================================================
// Type Exports
// ============================================================================

export type WhatsappImportInput = z.infer<typeof whatsappImportInput>;
export type ImportResult = z.infer<typeof importResultSchema>;
```

**Step 3: Commit**

```bash
git add packages/api/src/models/
git commit -m "feat(api): add Zod schemas for recordings and import endpoints"
```

---

## Task 6: Create Recordings Router

**Files:**
- Create: `packages/api/src/routers/recordings.ts`
- Modify: `packages/api/src/routers/index.ts`

**Step 1: Create recordings router**

```typescript
// packages/api/src/routers/recordings.ts
import { protectedProcedure } from "../index";
import {
  listRecordingsInput,
  getRecordingInput,
  createRecordingInput,
  updateRecordingInput,
  deleteRecordingInput,
  processPendingInput,
} from "../models/recordings";
import * as RecordingsService from "../services/recordings";

/**
 * Recordings Router
 * 
 * All endpoints require authentication (protectedProcedure).
 * 
 * Endpoints:
 * - list: Get paginated recordings with optional search
 * - get: Get single recording by ID
 * - create: Upload new recording (base64 audio)
 * - update: Update recording metadata (recordedAt, keywords)
 * - delete: Delete recording and audio file
 * - processPending: Trigger transcription for pending recordings
 */
export const recordingsRouter = {
  /**
   * List recordings with optional search and pagination.
   * 
   * @example
   * ```typescript
   * const recordings = await client.recordings.list({ limit: 20, search: "meeting" });
   * ```
   */
  list: protectedProcedure
    .input(listRecordingsInput)
    .handler(async ({ input }) => {
      return RecordingsService.listRecordings({
        limit: input.limit,
        offset: input.offset,
        search: input.search,
      });
    }),

  /**
   * Get a single recording by ID.
   * 
   * @throws NOT_FOUND if recording doesn't exist
   * 
   * @example
   * ```typescript
   * const recording = await client.recordings.get({ id: "uuid" });
   * ```
   */
  get: protectedProcedure
    .input(getRecordingInput)
    .handler(async ({ input }) => {
      return RecordingsService.getRecording(input.id);
    }),

  /**
   * Create a new recording from uploaded audio.
   * Accepts base64-encoded audio data.
   * Automatically converts opus/ogg to m4a for iOS compatibility.
   * Triggers transcription in background.
   * 
   * @throws BAD_REQUEST if upload fails
   * 
   * @example
   * ```typescript
   * const recording = await client.recordings.create({
   *   file: base64Audio,
   *   filename: "recording.m4a",
   *   durationSeconds: 30,
   * });
   * ```
   */
  create: protectedProcedure
    .input(createRecordingInput)
    .handler(async ({ input, context }) => {
      return RecordingsService.createRecording({
        userId: context.user.id,
        file: input.file,
        filename: input.filename,
        durationSeconds: input.durationSeconds,
        recordedAt: input.recordedAt ? new Date(input.recordedAt) : undefined,
      });
    }),

  /**
   * Update recording metadata.
   * Can update recordedAt timestamp and/or replace all keywords.
   * 
   * @throws NOT_FOUND if recording doesn't exist
   * 
   * @example
   * ```typescript
   * const updated = await client.recordings.update({
   *   id: "uuid",
   *   keywords: ["meeting", "project"],
   * });
   * ```
   */
  update: protectedProcedure
    .input(updateRecordingInput)
    .handler(async ({ input }) => {
      return RecordingsService.updateRecording({
        id: input.id,
        recordedAt: input.recordedAt ? new Date(input.recordedAt) : undefined,
        keywords: input.keywords,
      });
    }),

  /**
   * Delete a recording and its audio file.
   * 
   * @throws NOT_FOUND if recording doesn't exist
   * @throws BAD_REQUEST if storage deletion fails
   * 
   * @example
   * ```typescript
   * await client.recordings.delete({ id: "uuid" });
   * ```
   */
  delete: protectedProcedure
    .input(deleteRecordingInput)
    .handler(async ({ input }) => {
      return RecordingsService.deleteRecording(input.id);
    }),

  /**
   * Process pending recordings (transcription + keyword generation).
   * Used for batch processing or retrying failed transcriptions.
   * 
   * @example
   * ```typescript
   * const result = await client.recordings.processPending({ limit: 10 });
   * console.log(`Processed ${result.processed}, ${result.remaining} remaining`);
   * ```
   */
  processPending: protectedProcedure
    .input(processPendingInput)
    .handler(async ({ input }) => {
      return RecordingsService.processPendingRecordings(input.limit ?? 10);
    }),
};
```

**Step 2: Update app router**

```typescript
// packages/api/src/routers/index.ts
import type { RouterClient } from "@orpc/server";
import { publicProcedure } from "../index";
import { recordingsRouter } from "./recordings";
import { todoRouter } from "./todo";

/**
 * Root application router.
 * 
 * All sub-routers are composed here and exported as a single router.
 * The AppRouterClient type is used by the native app for type inference.
 * 
 * @example Server usage:
 * ```typescript
 * const handler = new RPCHandler(appRouter);
 * ```
 * 
 * @example Client usage:
 * ```typescript
 * const client: AppRouterClient = createORPCClient(link);
 * await client.recordings.list({ limit: 20 });
 * ```
 */
export const appRouter = {
  /**
   * Health check endpoint.
   * Returns "OK" if the server is running.
   */
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),

  /**
   * Todo endpoints (example/demo).
   */
  todo: todoRouter,

  /**
   * Recordings endpoints.
   * Requires authentication.
   */
  recordings: recordingsRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
```

**Step 3: Verify build**

Run: `bun turbo build --filter=@relune/api`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/api/src/routers/
git commit -m "feat(api): add recordings router with full CRUD + transcription"
```

---

## Task 7: Create Import Router

**Files:**
- Create: `packages/api/src/routers/import.ts`
- Modify: `packages/api/src/routers/index.ts`

**Step 1: Create import router**

```typescript
// packages/api/src/routers/import.ts
import { ORPCError } from "@orpc/server";
import { fileTypeFromBuffer } from "file-type";
import JSZip from "jszip";
import { protectedProcedure } from "../index";
import { whatsappImportInput } from "../models/import";
import { convertToM4a, needsConversion } from "../services/audio-converter";
import * as ImportService from "../services/import";
import * as RecordingsService from "../services/recordings";
import { getContentType, uploadAudioToStorage } from "../services/storage";

/**
 * Import Router
 * 
 * Handles importing recordings from external sources.
 * Currently supports WhatsApp chat export ZIP files.
 */
export const importRouter = {
  /**
   * Import recordings from a WhatsApp chat export ZIP file.
   * 
   * The ZIP file should contain:
   * - _chat.txt: WhatsApp chat export file
   * - Audio files (.opus, .m4a, .mp3, .wav, .ogg)
   * 
   * Process:
   * 1. Validate ZIP file
   * 2. Parse _chat.txt for audio message metadata
   * 3. For each audio message:
   *    - Resolve/create user by display name
   *    - Check for duplicates
   *    - Convert audio to m4a if needed
   *    - Upload to storage
   *    - Create recording in database
   * 4. Trigger transcription for imported recordings
   * 
   * @throws BAD_REQUEST if file is not a ZIP or missing _chat.txt
   * 
   * @example
   * ```typescript
   * const result = await client.import.whatsapp({ file: base64ZipData });
   * console.log(`Imported ${result.imported} recordings`);
   * ```
   */
  whatsapp: protectedProcedure
    .input(whatsappImportInput)
    .handler(async ({ input }) => {
      const { file } = input;

      // Convert base64 string to buffer
      const fileBuffer = Buffer.from(file, "base64");

      // Validate it's a zip file
      const fileType = await fileTypeFromBuffer(fileBuffer);
      if (fileType?.mime !== "application/zip") {
        throw new ORPCError("BAD_REQUEST", {
          message: "File must be a ZIP archive",
          data: { code: "INVALID_FILE_TYPE" },
        });
      }

      // Extract ZIP contents
      const zip = await JSZip.loadAsync(fileBuffer);

      // Find _chat.txt and audio files
      let chatTxtContent: string | null = null;
      const audioFiles = new Map<string, Uint8Array>();

      for (const [filename, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;

        const baseName = filename.split("/").pop() || filename;

        if (baseName === "_chat.txt") {
          chatTxtContent = await zipEntry.async("string");
        } else if (
          baseName.match(/\.(opus|m4a|mp3|wav|ogg)$/i) &&
          !baseName.startsWith(".")
        ) {
          const content = await zipEntry.async("uint8array");
          audioFiles.set(baseName, content);
        }
      }

      if (!chatTxtContent) {
        throw new ORPCError("BAD_REQUEST", {
          message: "No _chat.txt found in ZIP archive",
          data: { code: "MISSING_CHAT_TXT" },
        });
      }

      // Parse chat.txt
      const { audioMessages, errors: parseErrors } =
        ImportService.parseChatTxt(chatTxtContent);

      // Process each audio message
      const imported: Array<{ id: string; filename: string }> = [];
      const skipped: string[] = [];
      const failed: Array<{ filename: string; error: string }> = [];

      // Cache user IDs to avoid repeated lookups
      const userCache = new Map<string, string>();

      for (const msg of audioMessages) {
        try {
          // Resolve user
          let userId = userCache.get(msg.sender);
          if (!userId) {
            userId = await ImportService.resolveOrCreateUser(msg.sender);
            userCache.set(msg.sender, userId);
          }

          // Check for duplicate
          const isDupe = await ImportService.checkDuplicate(
            userId,
            msg.filename,
          );
          if (isDupe) {
            skipped.push(msg.filename);
            continue;
          }

          // Find audio file in zip
          const audioContent = audioFiles.get(msg.filename);
          if (!audioContent) {
            failed.push({
              filename: msg.filename,
              error: "Audio file not found in ZIP",
            });
            continue;
          }

          // Convert to m4a if needed
          let finalContent = audioContent;
          let finalFilename = msg.filename;
          if (needsConversion(msg.filename)) {
            const converted = await convertToM4a(audioContent, msg.filename);
            finalContent = converted.data;
            finalFilename = converted.filename;
          }

          // Upload to storage
          const contentType = getContentType(finalFilename);
          const uploadResult = await uploadAudioToStorage(
            finalFilename,
            finalContent,
            contentType,
          );

          if (uploadResult.error) {
            failed.push({
              filename: msg.filename,
              error: `Upload failed: ${uploadResult.error}`,
            });
            continue;
          }

          // Create recording
          const recordingId = await ImportService.createImportedRecording({
            userId,
            audioUrl: uploadResult.url,
            recordedAt: msg.timestamp,
            originalFilename: msg.filename,
            notes: msg.notes,
            fileSizeBytes: finalContent.length,
          });

          imported.push({ id: recordingId, filename: msg.filename });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          failed.push({ filename: msg.filename, error: errorMessage });
        }
      }

      // Trigger transcription for all imported recordings (fire-and-forget)
      if (imported.length > 0) {
        RecordingsService.processPendingRecordings(imported.length).catch(
          (err) =>
            console.error("Transcription failed for imported recordings:", err),
        );
      }

      return {
        imported: imported.length,
        skipped: skipped.length,
        failed,
        parseErrors,
        recordings: imported,
      };
    }),
};
```

**Step 2: Update app router to include import**

```typescript
// packages/api/src/routers/index.ts
import type { RouterClient } from "@orpc/server";
import { publicProcedure } from "../index";
import { importRouter } from "./import";
import { recordingsRouter } from "./recordings";
import { todoRouter } from "./todo";

/**
 * Root application router.
 * 
 * All sub-routers are composed here and exported as a single router.
 * The AppRouterClient type is used by the native app for type inference.
 * 
 * @example Server usage:
 * ```typescript
 * const handler = new RPCHandler(appRouter);
 * ```
 * 
 * @example Client usage:
 * ```typescript
 * const client: AppRouterClient = createORPCClient(link);
 * await client.recordings.list({ limit: 20 });
 * ```
 */
export const appRouter = {
  /**
   * Health check endpoint.
   * Returns "OK" if the server is running.
   */
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),

  /**
   * Todo endpoints (example/demo).
   */
  todo: todoRouter,

  /**
   * Recordings endpoints.
   * Requires authentication.
   */
  recordings: recordingsRouter,

  /**
   * Import endpoints.
   * Requires authentication.
   */
  import: importRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
```

**Step 3: Update package.json for file-type and jszip**

Add to `packages/api/package.json`:
```json
{
  "dependencies": {
    "file-type": "^19.0.0",
    "jszip": "^3.10.1"
  }
}
```

**Step 4: Verify build**

Run: `bun turbo build --filter=@relune/api`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add packages/api/
git commit -m "feat(api): add import router for WhatsApp ZIP imports"
```

---

## Task 8: Update Server Entry Point

**Files:**
- Modify: `apps/server/src/index.ts`

**Step 1: Simplify server to just mount oRPC**

```typescript
// apps/server/src/index.ts
import { cors } from "@elysiajs/cors";
import { createContext } from "@relune/api/context";
import { appRouter } from "@relune/api/routers/index";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Elysia } from "elysia";
import { env } from "@relune/env";

/**
 * oRPC handlers for RPC and OpenAPI endpoints.
 * 
 * RPCHandler: Handles type-safe RPC calls at /rpc/*
 * OpenAPIHandler: Provides OpenAPI documentation at /api/*
 */
const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error("[oRPC Error]", error);
    }),
  ],
});

const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error("[OpenAPI Error]", error);
    }),
  ],
});

/**
 * Elysia server - thin wrapper that mounts oRPC handlers.
 * 
 * Routes:
 * - GET /         : Health check
 * - ALL /rpc/*    : oRPC RPC handler (type-safe client calls)
 * - ALL /api/*    : OpenAPI handler (docs + REST-style calls)
 */
const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  )
  .all("/rpc/*", async (context) => {
    const { response } = await rpcHandler.handle(context.request, {
      prefix: "/rpc",
      context: createContext(context.request.headers),
    });
    return response ?? new Response("Not Found", { status: 404 });
  })
  .all("/api/*", async (context) => {
    const { response } = await apiHandler.handle(context.request, {
      prefix: "/api",
      context: createContext(context.request.headers),
    });
    return response ?? new Response("Not Found", { status: 404 });
  })
  .get("/", () => "OK")
  .listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
    console.log("  - RPC endpoint: http://localhost:3000/rpc");
    console.log("  - API docs: http://localhost:3000/api");
  });

export type App = typeof app;
```

**Step 2: Verify server starts**

Run: `cd apps/server && bun run dev`
Expected: Server starts without errors

**Step 3: Commit**

```bash
git add apps/server/src/index.ts
git commit -m "refactor(server): simplify to thin oRPC wrapper"
```

---

## Task 9: Update Native App API Client

**Files:**
- Modify: `apps/native/lib/api.ts`

**Step 1: Update API client with auth headers and remove Eden**

```typescript
// apps/native/lib/api.ts
import type { AppRouterClient } from "@relune/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { env } from "@relune/env";
import { getSupabaseClient } from "./supabase";

/**
 * React Query client with error logging.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.error("[Query Error]", error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

/**
 * oRPC link with automatic auth header injection.
 * 
 * Extracts the current Supabase session token and includes it
 * in the Authorization header for all RPC calls.
 */
export const link = new RPCLink({
  url: `${env.EXPO_PUBLIC_API_URL}/rpc`,
  headers: async () => {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  },
});

/**
 * Type-safe oRPC client.
 * 
 * @example
 * ```typescript
 * // Direct call
 * const recordings = await client.recordings.list({ limit: 20 });
 * 
 * // With TanStack Query
 * const { data } = useQuery(orpc.recordings.list.queryOptions({ input: { limit: 20 } }));
 * ```
 */
export const client: AppRouterClient = createORPCClient(link);

/**
 * TanStack Query utilities for oRPC.
 * 
 * Provides .queryOptions() and .mutationOptions() for all procedures.
 * 
 * @example
 * ```typescript
 * // Query
 * const { data } = useQuery(orpc.recordings.list.queryOptions({ input: { limit: 20 } }));
 * 
 * // Mutation
 * const mutation = useMutation(orpc.recordings.delete.mutationOptions());
 * mutation.mutate({ id: "uuid" });
 * ```
 */
export const orpc = createTanstackQueryUtils(client);

/**
 * Helper to check if an error is a network error (offline).
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error && error.message === "Network request failed") {
    return true;
  }
  return false;
}

/**
 * Extract error message from oRPC error.
 * Handles ORPCError structure: { message, code, data }
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  
  if (error instanceof Error) {
    return error.message || fallback;
  }
  
  if (typeof error === "object" && "message" in error) {
    const msg = (error as { message?: string }).message;
    if (msg) return msg;
  }
  
  return fallback;
}
```

**Step 2: Commit**

```bash
git add apps/native/lib/api.ts
git commit -m "refactor(native): update API client to use oRPC with auth headers"
```

---

## Task 10: Update Native App Queries

**Files:**
- Modify: `apps/native/queries/recordings.ts`

**Step 1: Update queries to use oRPC**

```typescript
// apps/native/queries/recordings.ts
import { orpc } from "@/lib/api";

/**
 * Query options for fetching recordings list.
 * 
 * @param params - Optional pagination and search params
 * @returns queryOptions compatible with useQuery()
 * 
 * @example
 * ```typescript
 * const { data, isLoading } = useQuery(recordingsQueryOptions({ limit: 20 }));
 * ```
 */
export const recordingsQueryOptions = (params?: {
  limit?: number;
  offset?: number;
  search?: string;
}) =>
  orpc.recordings.list.queryOptions({
    input: {
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
      search: params?.search,
    },
  });

/**
 * Query options for fetching a single recording.
 * 
 * @param id - Recording UUID
 * @returns queryOptions compatible with useQuery()
 * 
 * @example
 * ```typescript
 * const { data, isLoading } = useQuery(recordingQueryOptions("uuid"));
 * ```
 */
export const recordingQueryOptions = (id: string) =>
  orpc.recordings.get.queryOptions({
    input: { id },
    enabled: id.length > 0,
  });

/**
 * Type exports for use in components.
 * These are inferred from the oRPC client types.
 */
export type RecordingWithKeywords = Awaited<
  ReturnType<typeof orpc.recordings.get.queryOptions>
>["queryFn"] extends () => Promise<infer T> ? T : never;

export type ListRecordingsResult = Awaited<
  ReturnType<typeof orpc.recordings.list.queryOptions>
>["queryFn"] extends () => Promise<infer T> ? T : never;
```

**Step 2: Commit**

```bash
git add apps/native/queries/recordings.ts
git commit -m "refactor(native): update recordings queries to use oRPC"
```

---

## Task 11: Update Native App Features (Mutations)

**Files:**
- Modify: `apps/native/features/recordings.ts`
- Modify: `apps/native/features/upload.ts`
- Modify: `apps/native/features/import.ts`

**Step 1: Update recordings mutations**

```typescript
// apps/native/features/recordings.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client, orpc } from "@/lib/api";

/**
 * Recordings feature: mutations for recordings management.
 * Uses oRPC for type-safe API calls.
 */

/**
 * Mutation hook for deleting a recording.
 * Invalidates recordings list cache on success.
 * 
 * @example
 * ```typescript
 * const { mutate, isPending } = useDeleteRecordingMutation();
 * mutate("uuid", { onSuccess: () => navigation.goBack() });
 * ```
 */
export function useDeleteRecordingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return client.recordings.delete({ id });
    },
    onSuccess: (_, id) => {
      // Invalidate recordings list
      queryClient.invalidateQueries({ 
        queryKey: orpc.recordings.list.getQueryKey() 
      });
      // Also invalidate specific recording query
      queryClient.invalidateQueries({ 
        queryKey: orpc.recordings.get.getQueryKey({ input: { id } }) 
      });
    },
  });
}

export type UpdateRecordingParams = {
  id: string;
  recordedAt?: string;
  keywords?: string[];
};

/**
 * Mutation hook for updating a recording's metadata.
 * Can update recordedAt timestamp and/or keywords.
 * 
 * @example
 * ```typescript
 * const { mutate } = useUpdateRecordingMutation();
 * mutate({ id: "uuid", keywords: ["meeting", "notes"] });
 * ```
 */
export function useUpdateRecordingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, recordedAt, keywords }: UpdateRecordingParams) => {
      return client.recordings.update({ id, recordedAt, keywords });
    },
    onSuccess: (_, { id }) => {
      // Invalidate recordings list
      queryClient.invalidateQueries({ 
        queryKey: orpc.recordings.list.getQueryKey() 
      });
      // Also invalidate specific recording
      queryClient.invalidateQueries({ 
        queryKey: orpc.recordings.get.getQueryKey({ input: { id } }) 
      });
    },
  });
}
```

**Step 2: Update upload feature**

```typescript
// apps/native/features/upload.ts
import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { File } from "expo-file-system";
import { client, isNetworkError, orpc, queryClient } from "@/lib/api";
import { uploadQueueStore } from "@/stores/upload-queue";

export interface UploadRecordingParams {
  uri: string;
  durationSeconds: number;
  recordedAt?: Date;
}

const MAX_RETRIES = 3;

/**
 * Mutation hook for uploading a recording to the server.
 * 
 * On success: invalidates the recordings query cache.
 * On network error: caller should queue via uploadQueueStore.
 * 
 * @example
 * ```typescript
 * const mutation = useUploadRecordingMutation();
 * mutation.mutate(params, {
 *   onError: (error) => {
 *     if (isNetworkError(error)) {
 *       addToQueue({ ... });
 *     }
 *   },
 * });
 * ```
 */
export function useUploadRecordingMutation() {
  return useMutation({
    mutationFn: async (params: UploadRecordingParams) => {
      const file = new File(params.uri);
      const base64 = file.base64Sync();
      
      return client.recordings.create({
        file: base64,
        filename: file.name,
        durationSeconds: params.durationSeconds,
        recordedAt: (params.recordedAt ?? new Date()).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orpc.recordings.list.getQueryKey(),
      });
    },
  });
}

/**
 * Hook that returns a function to process the upload queue.
 * Retries failed uploads when called (e.g., on app foreground, network restore).
 */
export function useProcessUploadQueue() {
  const isProcessingRef = useRef(false);

  const processQueue = useCallback(async (): Promise<void> => {
    const state = uploadQueueStore.getState();

    // Prevent concurrent processing
    if (isProcessingRef.current || state.isProcessing) {
      return;
    }

    // Get pending items that haven't exceeded max retries
    const pendingItems = state.queue.filter(
      (item) =>
        (item.status === "pending" || item.status === "failed") &&
        item.retryCount < MAX_RETRIES,
    );

    if (pendingItems.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    uploadQueueStore.setState({ isProcessing: true });

    for (const item of pendingItems) {
      try {
        uploadQueueStore.getState().updateStatus(item.id, "uploading");

        // Upload using oRPC client
        const file = new File(item.uri);
        const base64 = file.base64Sync();

        await client.recordings.create({
          file: base64,
          filename: file.name,
          durationSeconds: item.durationSeconds,
          recordedAt: item.recordedAt,
        });

        // Success - remove from queue and invalidate recordings cache
        uploadQueueStore.getState().removeFromQueue(item.id);
        queryClient.invalidateQueries({
          queryKey: orpc.recordings.list.getQueryKey(),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";

        // If it's a network error, stop processing and try later
        if (isNetworkError(error)) {
          uploadQueueStore
            .getState()
            .updateStatus(item.id, "pending", "Network unavailable");
          break;
        }

        // Check if it's an auth error
        const isAuthError =
          error instanceof Error &&
          (message.includes("401") ||
            message.includes("403") ||
            message.includes("Unauthorized") ||
            message.includes("Forbidden") ||
            message.includes("UNAUTHORIZED"));

        if (isAuthError) {
          uploadQueueStore
            .getState()
            .updateStatus(item.id, "pending", "Authentication required");
          break;
        }

        // Mark as failed for retry
        uploadQueueStore.getState().updateStatus(item.id, "failed", message);
      }
    }

    uploadQueueStore.setState({ isProcessing: false });
    isProcessingRef.current = false;
  }, []);

  return { processQueue };
}
```

**Step 3: Update import feature**

```typescript
// apps/native/features/import.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile } from "expo-file-system";
import { client, orpc } from "@/lib/api";

/**
 * Mutation hook for importing WhatsApp chat exports.
 * Opens file picker, uploads ZIP to server, returns import results.
 * 
 * @example
 * ```typescript
 * const { mutate, isPending, data } = useImportWhatsAppMutation();
 * 
 * const handleImport = () => {
 *   mutate(undefined, {
 *     onSuccess: (result) => {
 *       console.log(`Imported ${result.imported} recordings`);
 *     },
 *   });
 * };
 * ```
 */
export function useImportWhatsAppMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 1. Open file picker for ZIP files
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/zip", "application/x-zip-compressed"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        throw new Error("CANCELLED");
      }

      const asset = result.assets[0];

      // 2. Create base64 from URI using expo-file-system
      const file = new ExpoFile(asset.uri).base64Sync();

      // 3. Upload to server via oRPC
      return client.import.whatsapp({ file });
    },
    onSuccess: () => {
      // Refresh recordings list after successful import
      queryClient.invalidateQueries({
        queryKey: orpc.recordings.list.getQueryKey(),
      });
    },
  });
}
```

**Step 4: Commit**

```bash
git add apps/native/features/
git commit -m "refactor(native): update all features to use oRPC mutations"
```

---

## Task 12: Update lib/upload-recording.ts

**Files:**
- Modify: `apps/native/lib/upload-recording.ts`

**Step 1: Update to use oRPC client**

```typescript
// apps/native/lib/upload-recording.ts
import { File } from "expo-file-system";
import { client } from "@/lib/api";

export interface UploadRecordingParams {
  uri: string;
  durationSeconds: number;
  recordedAt: string; // ISO 8601
}

/**
 * Shared upload function used by both the mutation hook and the queue worker.
 * Converts a React Native file URI to base64 and uploads via oRPC.
 * 
 * @param params - Upload parameters
 * @returns The created recording
 * @throws Error if upload fails
 */
export async function uploadRecording(params: UploadRecordingParams) {
  const file = new File(params.uri);
  const base64 = file.base64Sync();

  return client.recordings.create({
    file: base64,
    filename: file.name,
    durationSeconds: params.durationSeconds,
    recordedAt: params.recordedAt,
  });
}
```

**Step 2: Commit**

```bash
git add apps/native/lib/upload-recording.ts
git commit -m "refactor(native): update upload-recording to use oRPC"
```

---

## Task 13: Remove Eden Treaty and Unused Elysia Code

**Files:**
- Modify: `apps/native/package.json` (remove @elysiajs/eden)
- Delete: `apps/server/src/modules/` (entire directory)
- Delete: `apps/server/src/shared/` (entire directory - moved to packages/api)

**Step 1: Remove Eden Treaty dependency**

Edit `apps/native/package.json` to remove:
```json
"@elysiajs/eden": "^1.3.1",
```

**Step 2: Delete unused Elysia modules from server**

```bash
rm -rf apps/server/src/modules
rm -rf apps/server/src/shared
```

**Step 3: Update imports if any remain**

Check for any remaining imports from deleted modules and update them.

**Step 4: Run full build**

```bash
bun turbo build
```
Expected: Build succeeds

**Step 5: Run type check**

```bash
bun turbo check-types
```
Expected: No type errors

**Step 6: Install dependencies**

```bash
bun install
```

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove Eden Treaty and unused Elysia modules"
```

---

## Task 14: Update Package Exports

**Files:**
- Modify: `packages/api/package.json`

**Step 1: Update exports for better discoverability**

```json
{
  "name": "@relune/api",
  "type": "module",
  "exports": {
    ".": {
      "default": "./src/index.ts"
    },
    "./context": {
      "default": "./src/context.ts"
    },
    "./routers": {
      "default": "./src/routers/index.ts"
    },
    "./routers/*": {
      "default": "./src/routers/*.ts"
    },
    "./models/*": {
      "default": "./src/models/*.ts"
    },
    "./services/*": {
      "default": "./src/services/*.ts"
    },
    "./middleware/*": {
      "default": "./src/middleware/*.ts"
    }
  },
  "dependencies": {
    "@orpc/server": "catalog:",
    "@orpc/client": "catalog:",
    "@orpc/openapi": "catalog:",
    "@orpc/zod": "catalog:",
    "@supabase/supabase-js": "catalog:",
    "@ai-sdk/openai": "catalog:",
    "ai": "catalog:",
    "drizzle-orm": "catalog:",
    "file-type": "^19.0.0",
    "jszip": "^3.10.1",
    "node-av": "catalog:",
    "zod": "catalog:",
    "@relune/env": "workspace:*",
    "@relune/db": "workspace:*"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "@types/node": "catalog:",
    "@relune/config": "workspace:*"
  }
}
```

**Step 2: Commit**

```bash
git add packages/api/package.json
git commit -m "chore(api): update package exports for all modules"
```

---

## Task 15: Add API Documentation

**Files:**
- Create: `packages/api/README.md`

**Step 1: Create comprehensive README**

```markdown
# @relune/api

Type-safe API layer using oRPC with Zod validation.

## Architecture

```
packages/api/
├── src/
│   ├── index.ts          # Base + protected procedures
│   ├── context.ts        # Request context (headers, user)
│   ├── middleware/
│   │   └── auth.ts       # Supabase auth middleware
│   ├── models/           # Zod schemas
│   │   ├── recordings.ts
│   │   └── import.ts
│   ├── routers/          # oRPC routers
│   │   ├── index.ts      # Root router (appRouter)
│   │   ├── recordings.ts
│   │   └── import.ts
│   └── services/         # Business logic
│       ├── recordings.ts
│       ├── import.ts
│       ├── storage.ts
│       ├── audio-converter.ts
│       └── supabase.ts
```

## Usage

### Server (apps/server)

```typescript
import { createContext } from "@relune/api/context";
import { appRouter } from "@relune/api/routers";
import { RPCHandler } from "@orpc/server/fetch";

const handler = new RPCHandler(appRouter);

// In your HTTP handler:
const { response } = await handler.handle(request, {
  prefix: "/rpc",
  context: createContext(request.headers),
});
```

### Client (apps/native)

```typescript
import type { AppRouterClient } from "@relune/api/routers";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

const link = new RPCLink({
  url: "http://localhost:3000/rpc",
  headers: async () => ({
    Authorization: `Bearer ${token}`,
  }),
});

const client: AppRouterClient = createORPCClient(link);
const orpc = createTanstackQueryUtils(client);

// Direct call
const recordings = await client.recordings.list({ limit: 20 });

// With React Query
const { data } = useQuery(orpc.recordings.list.queryOptions({
  input: { limit: 20 }
}));
```

## Endpoints

### Public

- `healthCheck` - Returns "OK"

### Protected (requires auth)

#### Recordings

- `recordings.list` - List recordings with search/pagination
- `recordings.get` - Get single recording by ID
- `recordings.create` - Upload new recording (base64)
- `recordings.update` - Update metadata/keywords
- `recordings.delete` - Delete recording + audio file
- `recordings.processPending` - Trigger transcription

#### Import

- `import.whatsapp` - Import WhatsApp chat export ZIP

## Error Handling

All errors are thrown as `ORPCError` with standard codes:

- `UNAUTHORIZED` - Missing or invalid auth token
- `FORBIDDEN` - Valid token but not allowed
- `NOT_FOUND` - Resource doesn't exist
- `BAD_REQUEST` - Invalid input or operation failed

```typescript
import { ORPCError } from "@orpc/server";

throw new ORPCError("NOT_FOUND", {
  message: "Recording not found",
  data: { code: "RECORDING_NOT_FOUND", id },
});
```

## Adding New Endpoints

1. **Create model** (`models/<feature>.ts`):
   ```typescript
   export const myInput = z.object({ ... });
   export type MyInput = z.infer<typeof myInput>;
   ```

2. **Create service** (`services/<feature>.ts`):
   ```typescript
   export async function myFunction(input: MyInput) {
     // Business logic, throw ORPCError for errors
   }
   ```

3. **Create router** (`routers/<feature>.ts`):
   ```typescript
   export const myRouter = {
     myProcedure: protectedProcedure
       .input(myInput)
       .handler(async ({ input, context }) => {
         return myFunction(input);
       }),
   };
   ```

4. **Add to appRouter** (`routers/index.ts`):
   ```typescript
   export const appRouter = {
     // ...existing
     myFeature: myRouter,
   };
   ```
```

**Step 2: Commit**

```bash
git add packages/api/README.md
git commit -m "docs(api): add comprehensive README with usage examples"
```

---

## Task 16: Final Verification

**Step 1: Clean install**

```bash
rm -rf node_modules
rm bun.lock
bun install
```

**Step 2: Build all packages**

```bash
bun turbo build
```
Expected: All packages build successfully

**Step 3: Type check**

```bash
bun turbo check-types
```
Expected: No type errors

**Step 4: Start server and test**

```bash
cd apps/server && bun run dev
```

In another terminal, test health check:
```bash
curl http://localhost:3000/
```
Expected: "OK"

Test RPC endpoint:
```bash
curl -X POST http://localhost:3000/rpc/healthCheck
```
Expected: "OK"

**Step 5: Start native app**

```bash
cd apps/native && bun start
```
Expected: App starts without errors

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete oRPC migration from Elysia + Eden Treaty

- Move all business logic to packages/api
- Add auth middleware with Supabase token validation
- Create recordings and import routers with Zod validation
- Update native app to use oRPC client with TanStack Query
- Remove Eden Treaty dependency
- Add comprehensive API documentation

BREAKING: All API calls now use oRPC protocol at /rpc endpoint"
```

---

## Summary

### What Changed

| Component | Before | After |
|-----------|--------|-------|
| Server routes | Elysia controllers in `apps/server/src/modules/` | oRPC routers in `packages/api/src/routers/` |
| Validation | Elysia `t.*` schemas | Zod schemas in `packages/api/src/models/` |
| Auth | Elysia middleware via `derive` | oRPC middleware in `packages/api/src/middleware/auth.ts` |
| Client | Eden Treaty (`api.recordings.get()`) | oRPC client (`client.recordings.get()`) |
| React Query | Manual `queryFn` with Eden | `orpc.recordings.list.queryOptions()` |
| Type inference | `App` type export from server | `AppRouterClient` from `@relune/api/routers` |

### Benefits

1. **Type safety**: End-to-end types from server to client via oRPC
2. **Simpler validation**: Zod schemas are more widely used than Elysia's `t.*`
3. **Better React Query integration**: `orpc.*.queryOptions()` and `orpc.*.mutationOptions()`
4. **Cleaner architecture**: All API logic in one package (`packages/api`)
5. **OpenAPI docs**: Automatic API documentation at `/api`
6. **Testability**: Services can be tested independently of HTTP layer
