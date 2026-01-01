import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { orpc } from "@/lib/api";
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  configureAndroidChannel,
  registerForPushNotifications,
} from "@/lib/notifications";

/**
 * Mutation hook for registering a device token with the server.
 */
export function useRegisterDeviceTokenMutation() {
  return useMutation(orpc.notifications.registerToken.mutationOptions());
}

/**
 * Mutation hook for removing a device token from the server (on sign out).
 */
export function useRemoveDeviceTokenMutation() {
  return useMutation(orpc.notifications.removeToken.mutationOptions());
}

/**
 * Hook to initialize push notifications.
 * Should be called once after user is authenticated.
 *
 * - Requests permissions
 * - Gets Expo push token
 * - Registers token with server
 * - Sets up notification listeners
 */
export function useInitializeNotifications(isAuthenticated: boolean) {
  const registerMutation = useRegisterDeviceTokenMutation();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || hasInitialized.current) return;

    async function init() {
      try {
        // Configure Android channel first
        await configureAndroidChannel();

        // Request permissions and get token
        const token = await registerForPushNotifications();
        if (!token) {
          console.log("No push token available");
          return;
        }

        // Register token with server
        const platform = Platform.OS as "ios" | "android";
        registerMutation.mutate({ token, platform });

        hasInitialized.current = true;
      } catch (error) {
        console.error("Failed to initialize notifications:", error);
      }
    }

    init();

    // Set up notification listeners
    const receivedSubscription = addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification.request.content);
      }
    );

    const responseSubscription = addNotificationResponseListener((response) => {
      console.log(
        "Notification tapped:",
        response.notification.request.content
      );
      // TODO: Handle deep linking based on notification data
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [isAuthenticated, registerMutation]);
}
