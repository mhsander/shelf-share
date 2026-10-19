import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { FriendsProvider } from "@/hooks/use-friends";
import { LibraryProvider } from "@/hooks/use-library";
import { ProfileProvider } from "@/hooks/use-profile";

export default function RootLayout() {
  return (
    <LibraryProvider>
      <ProfileProvider>
        <FriendsProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="scan" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
            <Stack.Screen name="add-book" options={{ presentation: "modal" }} />
            <Stack.Screen name="edit-profile" options={{ presentation: "modal" }} />
            <Stack.Screen name="blocked-users" />
            <Stack.Screen name="book/[id]" />
            <Stack.Screen name="user/[id]" />
            <Stack.Screen name="friends" />
            <Stack.Screen name="invite/[code]" options={{ presentation: "modal" }} />
          </Stack>
        </FriendsProvider>
      </ProfileProvider>
    </LibraryProvider>
  );
}
