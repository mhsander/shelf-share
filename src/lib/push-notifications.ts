import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";

import { requireSupabase } from "@/lib/supabase";

const pushTokenStorageKey = "shelf-share.expo-push-token";

export type NotificationRoute =
  | { pathname: "/requests/[id]"; params: { id: string } }
  | { pathname: "/users/[id]"; params: { id: string } };

export function notificationRouteFromData(data: unknown): NotificationRoute | null {
  if (!data || typeof data !== "object") return null;
  if ("requestId" in data && typeof data.requestId === "string") {
    return { pathname: "/requests/[id]", params: { id: data.requestId } };
  }
  if ("userId" in data && typeof data.userId === "string") {
    return { pathname: "/users/[id]", params: { id: data.userId } };
  }
  return null;
}

export async function registerPushToken() {
  if (!Device.isDevice || Platform.OS === "web") return;
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: AndroidImportance.DEFAULT,
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  const permissions = currentPermissions.granted
    ? currentPermissions
    : await Notifications.requestPermissionsAsync();
  if (!permissions.granted) {
    await unregisterPushToken();
    return;
  }

  const projectId =
    Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    throw new Error("Set the EAS project ID before registering push notifications.");
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await requireSupabase().rpc("register_push_token", {
    p_expo_push_token: token,
    p_platform: Platform.OS,
  });
  if (error) throw error;

  await AsyncStorage.setItem(pushTokenStorageKey, token);
}

export async function unregisterPushToken() {
  const token = await AsyncStorage.getItem(pushTokenStorageKey);
  if (!token) return;

  const { error } = await requireSupabase().rpc("unregister_push_token", {
    p_expo_push_token: token,
  });
  if (error) throw error;

  await AsyncStorage.removeItem(pushTokenStorageKey);
}
