import { protectedProcedure } from "../index";
import { updateSettingsInput } from "../models/settings";
import * as SettingsService from "../services/settings";

/**
 * Settings Router
 *
 * Per-user preferences (auto-archive, etc).
 */
export const settingsRouter = {
  /**
   * Get current user's settings (creates default row if missing).
   */
  get: protectedProcedure.handler(({ context }) =>
    SettingsService.getOrCreateSettings(context.user.id)
  ),

  /**
   * Update current user's settings.
   */
  update: protectedProcedure
    .input(updateSettingsInput)
    .handler(({ context, input }) =>
      SettingsService.updateSettings({
        userId: context.user.id,
        autoArchiveDays: input.autoArchiveDays,
      })
    ),
};
