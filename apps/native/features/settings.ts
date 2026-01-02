import { useMutation, useQuery } from "@tanstack/react-query";
import * as Updates from "expo-updates";
import { Alert } from "react-native";
import { toast } from "@/components/ui/notifications";
import { orpc, queryClient } from "@/lib/api";

/**
 * Settings feature: queries and mutations for user settings.
 */

/**
 * Hook to fetch current user's settings.
 */
export function useSettings() {
  return useQuery(orpc.settings.get.queryOptions());
}

/**
 * Mutation hook for updating user settings.
 * Uses optimistic updates for instant UI feedback.
 *
 * @example
 * ```typescript
 * const { mutate } = useUpdateSettingsMutation();
 * mutate({ autoArchiveDays: 14 });
 * ```
 */
export function useUpdateSettingsMutation() {
  return useMutation(
    orpc.settings.update.mutationOptions({
      onMutate: async (newSettings) => {
        // Cancel outgoing refetches to avoid overwriting optimistic update
        await queryClient.cancelQueries({
          queryKey: orpc.settings.get.queryKey(),
        });

        // Snapshot previous value for rollback
        const previousSettings = queryClient.getQueryData(
          orpc.settings.get.queryKey()
        );

        // Optimistically update cache
        queryClient.setQueryData(
          orpc.settings.get.queryKey(),
          (old: typeof previousSettings) =>
            old ? { ...old, ...newSettings } : old
        );

        return { previousSettings };
      },
      onError: (_err, _newSettings, onMutateResult) => {
        // Rollback on error
        if (onMutateResult?.previousSettings) {
          queryClient.setQueryData(
            orpc.settings.get.queryKey(),
            onMutateResult.previousSettings
          );
        }
      },
      onSettled: () => {
        // Refetch to ensure server state is synced
        queryClient.invalidateQueries({
          queryKey: orpc.settings.get.queryKey(),
        });
      },
    })
  );
}

/**
 * Hook to fetch saved sender mappings.
 */
export function useSenderMappings() {
  return useQuery(orpc.senderMappings.list.queryOptions());
}

/**
 * Mutation hook for deleting a sender mapping.
 */
export function useDeleteSenderMappingMutation() {
  return useMutation(
    orpc.senderMappings.delete.mutationOptions({
      onSuccess: (_, _variables, _onMutateResult, context) => {
        context.client.invalidateQueries({
          queryKey: orpc.senderMappings.list.key(),
        });
      },
    })
  );
}

/**
 * Mutation hook to manually check for OTA updates and apply them.
 * Tapping on the version number triggers this check.
 *
 * @example
 * ```typescript
 * const { mutate, isPending } = useCheckForUpdatesMutation();
 * mutate(); // triggers the update check
 * ```
 */
export function useCheckForUpdatesMutation() {
  return useMutation({
    mutationFn: async () => {
      // In dev mode, expo-updates is not available
      if (__DEV__) {
        const error = new Error("OTA updates are disabled in development mode");
        error.name = "DevModeError";
        throw error;
      }

      return await Updates.checkForUpdateAsync();
    },
    onSuccess: (update) => {
      if (update.isAvailable) {
        // Use native Alert for confirmation
        Alert.alert(
          "Update Available",
          "A new version is available. Would you like to update now?",
          [
            { text: "Later", style: "cancel" },
            {
              text: "Update",
              onPress: async () => {
                toast({
                  title: "Downloading update...",
                  preset: "spinner",
                  duration: 10,
                });

                try {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch (_fetchError) {
                  toast({
                    title: "Update failed",
                    message: "Could not download the update",
                    preset: "error",
                    haptic: "error",
                  });
                }
              },
            },
          ]
        );
      } else {
        toast({
          title: "You're up to date!",
          preset: "done",
          haptic: "success",
        });
      }
    },
    onError: (error) => {
      if (error.name === "DevModeError") {
        toast({
          title: "Updates not available",
          message: "OTA updates are disabled in development mode",
          preset: "error",
          haptic: "warning",
        });
      } else {
        toast({
          title: "Update check failed",
          message: "Could not check for updates",
          preset: "error",
          haptic: "error",
        });
      }
    },
  });
}
