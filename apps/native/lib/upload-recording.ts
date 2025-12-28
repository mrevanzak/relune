import { File } from "expo-file-system";

import { client } from "@/lib/api";

export interface UploadRecordingParams {
  uri: string;
  durationSeconds: number;
  recordedAt: Date;
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

  return await client.recordings.create({
    file: base64,
    filename: file.name,
    durationSeconds: params.durationSeconds,
    recordedAt: params.recordedAt,
  });
}
