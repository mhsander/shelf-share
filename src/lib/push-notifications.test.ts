import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import {
  notificationRouteFromData,
  registerPushToken,
  unregisterPushToken,
} from "@/lib/push-notifications";

const mockRpc = jest.fn();

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { easConfig: { projectId: "test-project" } },
}));
jest.mock("expo-device", () => ({ isDevice: true }));
jest.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 3 },
  getExpoPushTokenAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
}));
jest.mock("@/lib/supabase", () => ({
  requireSupabase: () => ({ rpc: mockRpc }),
}));

const pushToken = "ExponentPushToken[test-device]";

describe("push token registration", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mockRpc.mockResolvedValue({ error: null });
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: true,
    } as Notifications.NotificationPermissionsStatus);
    jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({
      data: pushToken,
    } as Notifications.ExpoPushToken);
  });

  it("requests and saves a push token for the signed-in user", async () => {
    await registerPushToken();

    expect(mockRpc).toHaveBeenCalledWith("register_push_token", {
      p_expo_push_token: pushToken,
      p_platform: "ios",
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "shelf-share.expo-push-token",
      pushToken,
    );
  });

  it("does not register a token when notification permission is denied", async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: false,
    } as Notifications.NotificationPermissionsStatus);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      granted: false,
    } as Notifications.NotificationPermissionsStatus);

    await registerPushToken();

    expect(mockRpc).not.toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it("removes the local token after unregistering it from Supabase", async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(pushToken);

    await unregisterPushToken();

    expect(mockRpc).toHaveBeenCalledWith("unregister_push_token", {
      p_expo_push_token: pushToken,
    });
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("shelf-share.expo-push-token");
  });

  it("retains the local token when Supabase unregistering fails", async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(pushToken);
    mockRpc.mockResolvedValue({ error: new Error("network unavailable") });

    await expect(unregisterPushToken()).rejects.toThrow("network unavailable");

    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });

  it("routes borrow-request notifications to the request thread", () => {
    expect(notificationRouteFromData({ requestId: "request-id" })).toEqual({
      pathname: "/requests/[id]",
      params: { id: "request-id" },
    });
  });

  it("routes friend-request notifications to the user profile", () => {
    expect(notificationRouteFromData({ userId: "user-id" })).toEqual({
      pathname: "/users/[id]",
      params: { id: "user-id" },
    });
  });

  it("ignores notification payloads without a supported destination", () => {
    expect(notificationRouteFromData({ requestId: 12 })).toBeNull();
    expect(notificationRouteFromData(null)).toBeNull();
  });
});
