import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import {
  notificationRouteFromData,
  registerPushToken,
  type NotificationRoute,
} from "@/lib/push-notifications";

function getNotificationRoute(
  response: Notifications.NotificationResponse,
): NotificationRoute | null {
  return notificationRouteFromData(response.notification.request.content.data);
}

export function NotificationManager() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const pendingRoute = useRef<NotificationRoute | null>(null);
  const lastResponseId = useRef<string | null>(null);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const responseId = response.notification.request.identifier;
      if (lastResponseId.current === responseId) return;
      lastResponseId.current = responseId;
      pendingRoute.current = getNotificationRoute(response);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handleResponse(response);
      })
      .catch((error: unknown) => {
        console.warn("Could not read the last notification response.", error);
      });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!session || !profile || !pendingRoute.current) return;
    router.push(pendingRoute.current);
    pendingRoute.current = null;
  }, [profile, session]);

  useEffect(() => {
    if (!session || !profile) return;
    void registerPushToken().catch((error: unknown) => {
      console.warn("Could not register this device for push notifications.", error);
    });
  }, [profile, session]);

  return null;
}
