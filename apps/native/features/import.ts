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
