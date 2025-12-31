import { randomUUID } from "node:crypto";
import { supabase } from "./supabase";

/**
 * Shared storage utilities for uploading files to Supabase Storage
 */

/**
 * Get MIME type from filename extension
 */
export function getContentType(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  const ext = lastDot > 0 ? filename.slice(lastDot + 1).toLowerCase() : "";
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
  contentType: string
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

  // Get public URL (or use signed URL if bucket is private)
  const { data } = supabase.storage.from("audio").getPublicUrl(storagePath);

  return { url: data.publicUrl, error: null };
}

/**
 * Delete audio file from Supabase Storage by parsing the public URL
 * to extract the storage path (e.g. "recordings/<uuid>-<filename>")
 */
export async function deleteAudioFromStorage(
  audioUrl: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Parse the public URL to extract the storage path
    // Expected format: https://<project>.supabase.co/storage/v1/object/public/audio/<path>
    const url = new URL(audioUrl);
    const pathParts = url.pathname.split("/");

    // Find "audio" bucket index and get everything after it
    const audioBucketIndex = pathParts.indexOf("audio");
    if (audioBucketIndex === -1 || audioBucketIndex === pathParts.length - 1) {
      return {
        success: false,
        error: "Invalid audio URL: could not extract storage path",
      };
    }

    // Join remaining parts to get full storage path
    const storagePath = pathParts.slice(audioBucketIndex + 1).join("/");

    // Delete from storage
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

// ============================================================================
// Temporary File Storage (for import processing)
// ============================================================================

/**
 * Upload a temporary file for import processing.
 * Stored at temp/{uuid} in the audio bucket.
 * Should be deleted after processing via deleteTempFile().
 */
export async function uploadTempFile(
  content: Uint8Array
): Promise<{ fileRef: string; error: string | null }> {
  const fileRef = randomUUID();
  const storagePath = `temp/${fileRef}`;

  const { error } = await supabase.storage
    .from("audio")
    .upload(storagePath, content, {
      contentType: "application/zip",
      upsert: false,
    });

  if (error) {
    return { fileRef: "", error: error.message };
  }

  return { fileRef, error: null };
}

/**
 * Retrieve a temporary file by reference.
 * Returns the file content as Uint8Array.
 */
export async function getTempFile(
  fileRef: string
): Promise<{ data: Uint8Array | null; error: string | null }> {
  const storagePath = `temp/${fileRef}`;

  const { data, error } = await supabase.storage
    .from("audio")
    .download(storagePath);

  if (error) {
    return { data: null, error: error.message };
  }

  // Convert Blob to Uint8Array
  const arrayBuffer = await data.arrayBuffer();
  return { data: new Uint8Array(arrayBuffer), error: null };
}

/**
 * Delete a temporary file after processing.
 */
export async function deleteTempFile(
  fileRef: string
): Promise<{ success: boolean; error: string | null }> {
  const storagePath = `temp/${fileRef}`;

  const { error } = await supabase.storage.from("audio").remove([storagePath]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
