import { useMutation } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile } from "expo-file-system";
import { orpc } from "@/lib/api";

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
  return useMutation(orpc.import.whatsappPreview.mutationOptions());
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
  return useMutation(
    orpc.import.whatsapp.mutationOptions({
      onSuccess: (_data, _variables, _onMutateResult, context) => {
        // Refresh recordings list after successful import
        context.client.invalidateQueries({
          queryKey: orpc.recordings.list.key(),
        });
      },
    })
  );
}
