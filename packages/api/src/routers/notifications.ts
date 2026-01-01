import { protectedProcedure } from "../index";
import { registerDeviceTokenInput } from "../models/notifications";
import * as NotificationsService from "../services/notifications";

/**
 * Notifications Router
 *
 * Endpoints for device token registration and push notifications.
 */
export const notificationsRouter = {
  /**
   * Register a device token for push notifications.
   * Called by the app on startup after user is authenticated.
   */
  registerToken: protectedProcedure
    .input(registerDeviceTokenInput)
    .handler(({ context, input }) =>
      NotificationsService.registerDeviceToken(
        context.user.id,
        input.token,
        input.platform
      )
    ),

  /**
   * Remove a device token (e.g., on sign out).
   */
  removeToken: protectedProcedure
    .input(registerDeviceTokenInput.pick({ token: true }))
    .handler(({ context, input }) =>
      NotificationsService.removeDeviceToken(context.user.id, input.token)
    ),
};
