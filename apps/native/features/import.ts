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
 * Mutation hook for uploading a WhatsApp chat export ZIP to temp storage.
 * Returns a fileRef that can be used for preview and import.
 *
 * @example
 * ```typescript
 * const { mutate, data } = useUploadWhatsAppMutation();
 * mutate({ file: base64Data });
 * // data.fileRef contains the reference to use for preview/import
 * ```
 */
export function useUploadWhatsAppMutation() {
  return useMutation(orpc.import.whatsappUpload.mutationOptions());
}

/**
 * Mutation hook for previewing a WhatsApp chat export.
 * Returns sender names without importing.
 * Requires a fileRef from useUploadWhatsAppMutation.
 *
 * @example
 * ```typescript
 * const { mutate, data } = usePreviewWhatsAppMutation();
 * mutate({ fileRef: "uuid-from-upload" });
 * // data.senderNames contains unique sender names
 * ```
 */
export function usePreviewWhatsAppMutation() {
  return useMutation(orpc.import.whatsappPreview.mutationOptions());
}

/**
 * Mutation hook for importing WhatsApp chat exports with sender mappings.
 * Requires a fileRef from useUploadWhatsAppMutation.
 *
 * @example
 * ```typescript
 * const { mutate, isPending, data } = useImportWhatsAppMutation();
 *
 * mutate({
 *   fileRef: "uuid-from-upload",
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
