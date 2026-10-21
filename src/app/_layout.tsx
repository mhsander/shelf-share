import { QueryClientProvider } from "@tanstack/react-query";
import { router, Stack, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { colors } from "@/constants/theme";
import { NotificationManager } from "@/components/notification-manager";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { FriendsProvider } from "@/hooks/use-friends";
import { LibraryProvider } from "@/hooks/use-library";
import { ProfileProvider, useProfile } from "@/hooks/use-profile";
import { queryClient } from "@/lib/query-client";

function AuthGate() {
  const segments = useSegments();
  const { session, loading, configured } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const inSignIn = segments[0] === "sign-in";
  const inProfileSetup = segments[0] === "profile-setup";
  const redirecting =
    !loading &&
    ((!configured || !session)
      ? !inSignIn
      : !profileLoading &&
        (profile ? inSignIn || inProfileSetup : !profileError && !inProfileSetup));

  useEffect(() => {
    if (loading) return;
    if (!configured || !session) {
      if (!inSignIn) router.replace("/sign-in");
      return;
    }
    if (profileLoading) return;
    if (profileError) return;
    if (!profile) {
      if (!inProfileSetup) router.replace("/profile-setup");
      return;
    }
    if (inSignIn || inProfileSetup) router.replace("/(tabs)");
  }, [
    configured,
    inProfileSetup,
    inSignIn,
    loading,
    profile,
    profileError,
    profileLoading,
    session,
  ]);

  if (loading || (session && profileLoading) || redirecting) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (session && profileError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.error}>Could not load your profile: {profileError.message}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void queryClient.invalidateQueries({ queryKey: ["profile", session.user.id] })}
        >
          <Text style={styles.retry}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="scan" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="add-book" options={{ presentation: "modal" }} />
      <Stack.Screen name="edit-profile" options={{ presentation: "modal" }} />
      <Stack.Screen name="blocked-users" />
      <Stack.Screen name="books/[id]" />
      <Stack.Screen name="users/[id]" />
      <Stack.Screen name="requests/[id]" />
      <Stack.Screen name="friends" />
      <Stack.Screen name="invite/[code]" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfileProvider>
          <LibraryProvider>
            <FriendsProvider>
              <StatusBar style="dark" />
              <NotificationManager />
              <AuthGate />
            </FriendsProvider>
          </LibraryProvider>
        </ProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  error: {
    color: colors.danger,
    textAlign: "center",
  },
  retry: {
    marginTop: 14,
    color: colors.primary,
    fontWeight: "700",
  },
});
