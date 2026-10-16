import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { LibraryProvider } from "@/hooks/use-library";

export default function RootLayout() {
  return (
    <LibraryProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scan" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="add-book" options={{ presentation: "modal" }} />
      </Stack>
    </LibraryProvider>
  );
}
