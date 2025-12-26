import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile } from "expo-file-system";
import { api } from "@/lib/api";
import { recordingsQueryKey } from "./recordings";

/**
 * Mutation hook for importing WhatsApp chat exports.
 * Opens file picker, uploads ZIP to server, returns import results.
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

			// 2. Create File object from URI using expo-file-system
			const file = new ExpoFile(asset.uri).base64Sync();

			// 3. Upload to server
			const { data, error } = await api.import.whatsapp.post({ file });
			if (error) throw new Error(error.value?.message ?? "Import failed");
			if (!data || "error" in data) {
				throw new Error("Import failed");
			}
			return data;
		},
		onSuccess: () => {
			// Refresh recordings list after successful import
			queryClient.invalidateQueries({ queryKey: recordingsQueryKey });
		},
	});
}
