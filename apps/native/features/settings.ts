import { toast } from "@baronha/ting";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Updates from "expo-updates";
import { useCallback, useState } from "react";
import { Alert } from "react-native";
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
          queryKey: orpc.settings.get.key(),
        });

        // Snapshot previous value for rollback
        const previousSettings = queryClient.getQueryData(
          orpc.settings.get.key()
        );

        // Optimistically update cache
        queryClient.setQueryData(
          orpc.settings.get.key(),
          (old: typeof previousSettings) =>
            old ? { ...old, ...newSettings } : old
        );

        return { previousSettings };
      },
      onError: (_err, _newSettings, onMutateResult) => {
        // Rollback on error
        if (onMutateResult?.previousSettings) {
          queryClient.setQueryData(
            orpc.settings.get.key(),
            onMutateResult.previousSettings
          );
        }
      },
      onSettled: () => {
        // Refetch to ensure server state is synced
        queryClient.invalidateQueries({
          queryKey: orpc.settings.get.key(),
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
 * Hook to manually check for OTA updates and apply them.
 * Tapping on the version number triggers this check.
 */
export function useCheckForUpdates() {
  const [isChecking, setIsChecking] = useState(false);

  const checkForUpdate = useCallback(async () => {
    // In dev mode, expo-updates is not available
    if (__DEV__) {
      toast({
        title: "Updates not available",
        message: "OTA updates are disabled in development mode",
        preset: "error",
        haptic: "warning",
      });
      return;
    }

    setIsChecking(true);

    try {
      const update = await Updates.checkForUpdateAsync();

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
    } catch (_error) {
      toast({
        title: "Update check failed",
        message: "Could not check for updates",
        preset: "error",
        haptic: "error",
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { checkForUpdate, isChecking };
}
