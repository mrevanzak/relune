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
    if (!(dateStr && timeStr && sender && messageContent)) continue;

    const attachmentMatch = messageContent.match(attachmentPattern);
    if (!attachmentMatch) continue;

    const filename = attachmentMatch[1];
    if (!filename) continue;

    const isAudio = audioExtensions.some((ext) =>
      filename.toLowerCase().endsWith(ext)
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
      seconds
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
export async function resolveOrCreateUser(
  displayName: string
): Promise<string> {
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
  originalFilename: string
): Promise<boolean> {
  const existing = await db
    .select({ id: recordings.id })
    .from(recordings)
    .where(
      and(
        eq(recordings.userId, userId),
        eq(recordings.originalFilename, originalFilename)
      )
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
