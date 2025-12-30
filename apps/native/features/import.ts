import { useMutation } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile } from "expo-file-system";
import { orpc, safeClient } from "@/lib/api";

/**
 * Pick a WhatsApp export file and return its base64 content.
 * Does not upload - just picks and reads the file.
 */
export async function pickWhatsAppExportFile(): Promise<{
  base64: string;
  filename: string;
} | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/zip", "application/x-zip-compressed"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const base64 = new ExpoFile(asset.uri).base64Sync();

  return {
    base64,
    filename: asset.name,
  };
}

/**
 * Mutation hook for previewing a WhatsApp chat export.
 * Returns sender names without importing.
 *
 * @example
 * ```typescript
 * const { mutate, data } = usePreviewWhatsAppMutation();
 * mutate({ file: base64Data });
 * // data.senderNames contains unique sender names
 * ```
 */
export function usePreviewWhatsAppMutation() {
  return useMutation({
    mutationFn: async (params: { file: string }) => {
      const [error, data] = await safeClient.import.whatsappPreview({
        file: params.file,
      });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Mutation hook for importing WhatsApp chat exports with sender mappings.
 *
 * @example
 * ```typescript
 * const { mutate, isPending, data } = useImportWhatsAppMutation();
 *
 * mutate({
 *   file: base64Data,
 *   senderMappings: { "Sarah": "user-uuid-1" },
 *   saveMappings: true,
 * });
 * ```
 */
export function useImportWhatsAppMutation() {
  return useMutation({
    mutationFn: async (params: {
      file: string;
      senderMappings?: Record<string, string>;
      saveMappings?: boolean;
    }) => {
      const [error, data] = await safeClient.import.whatsapp({
        file: params.file,
        senderMappings: params.senderMappings,
        saveMappings: params.saveMappings,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, _variables, _onMutateResult, context) => {
      // Refresh recordings list after successful import
      context.client.invalidateQueries({
        queryKey: orpc.recordings.list.queryKey(),
      });
    },
  });
}

/**
 * Legacy mutation hook that opens file picker, uploads ZIP, returns results.
 * For simple imports without sender mapping.
 *
 * @deprecated Use pickWhatsAppExportFile + useImportWhatsAppMutation for new code
 */
export function useSimpleImportWhatsAppMutation() {
  return useMutation({
    mutationFn: async () => {
      // 1. Open file picker for ZIP files
      const pickedFile = await pickWhatsAppExportFile();
      if (!pickedFile) {
        throw new Error("CANCELLED");
      }

      // 2. Upload to server via oRPC
      const [error, data] = await safeClient.import.whatsapp({
        file: pickedFile.base64,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, _variables, _onMutateResult, context) => {
      // Refresh recordings list after successful import
      context.client.invalidateQueries({
        queryKey: orpc.recordings.list.queryKey(),
      });
    },
  });
}
