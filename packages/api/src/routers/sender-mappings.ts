import { protectedProcedure } from "../index";
import {
  deleteSenderMappingInput,
  upsertSenderMappingInput,
} from "../models/sender-mappings";
import * as SenderMappingsService from "../services/sender-mappings";

/**
 * Sender Mappings Router
 *
 * Stores per-user mappings from external sender names (e.g. WhatsApp "Sarah")
 * to internal user accounts.
 */
export const senderMappingsRouter = {
  /**
   * List current user's saved mappings.
   */
  list: protectedProcedure.handler(({ context }) =>
    SenderMappingsService.listSenderMappings(context.user.id)
  ),

  /**
   * Create or update a mapping (upsert on externalName per user).
   */
  upsert: protectedProcedure
    .input(upsertSenderMappingInput)
    .handler(({ context, input }) =>
      SenderMappingsService.upsertSenderMapping({
        userId: context.user.id,
        externalName: input.externalName,
        mappedUserId: input.mappedUserId,
      })
    ),

  /**
   * Delete a mapping by id.
   */
  delete: protectedProcedure
    .input(deleteSenderMappingInput)
    .handler(({ context, input }) =>
      SenderMappingsService.deleteSenderMapping({
        userId: context.user.id,
        id: input.id,
      })
    ),
};
