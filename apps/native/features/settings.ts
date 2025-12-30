import { useMutation, useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/api";

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
      onSuccess: (_, _variables, _onMutateResult, context) => {
        context.client.invalidateQueries({
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
