import { router } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { Children, type ReactNode } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { SettingsRow } from "@/components/settings-row";
import { links } from "@/constants/links";
import { colors } from "@/constants/theme";
import { useLibrary } from "@/hooks/use-library";
import { useProfile } from "@/hooks/use-profile";
import { libraryCounts } from "@/lib/profile";

async function openLink(url: string) {
  try {
    await openBrowserAsync(url);
  } catch {
    Alert.alert("Couldn't open the page.");
  }
}

function confirmSignOut() {
  Alert.alert("Sign out?", undefined, [
    { text: "Cancel", style: "cancel" },
    // TODO: call Supabase `signOut` once auth is in place.
    { text: "Sign out", onPress: () => {} },
  ]);
}

function confirmDeleteAccount() {
  Alert.alert(
    "Delete your account?",
    'This deletes your profile, books, and photo. Requests and messages with other people stay, shown as "Deleted user". This can\'t be undone.',
    [
      { text: "Cancel", style: "cancel" },
      // TODO: call the account-deletion Edge Function once auth is in place.
      { text: "Delete", style: "destructive", onPress: () => {} },
    ],
  );
}

// A rounded card of settings rows with hairlines between them.
function SettingsGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children);
  return (
    <View style={styles.group}>
      {rows.map((row, i) => (
        <View key={i} style={i > 0 && styles.divider}>
          {row}
        </View>
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const { profile, blocked } = useProfile();
  const { books } = useLibrary();
  const counts = libraryCounts(books);
  const location = [profile.neighborhood, profile.city]
    .filter(Boolean)
    .join(" · ");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <View style={styles.identity}>
            <Avatar
              name={profile.displayName}
              uri={profile.avatarUrl}
              size={72}
            />
            <View style={styles.identityText}>
              <Text style={styles.name}>{profile.displayName}</Text>
              <Text style={styles.location}>{location}</Text>
            </View>
          </View>
          <Text style={styles.counts}>
            {counts.total} {counts.total === 1 ? "book" : "books"} ·{" "}
            {counts.available} available · {counts.lent} lent
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/edit-profile")}
            style={({ pressed }) => [
              styles.outlineButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.outlineLabel}>Edit profile</Text>
          </Pressable>
        </View>

        <SettingsGroup>
          <SettingsRow
            label="Blocked users"
            icon="ban-outline"
            detail={blocked.length > 0 ? String(blocked.length) : undefined}
            onPress={() => router.push("/blocked-users")}
          />
          <SettingsRow
            label="Privacy policy"
            icon="shield-checkmark-outline"
            onPress={() => openLink(links.privacy)}
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            label="Sign out"
            icon="log-out-outline"
            onPress={confirmSignOut}
          />
          <SettingsRow
            label="Delete account"
            icon="trash-outline"
            danger
            onPress={confirmDeleteAccount}
          />
        </SettingsGroup>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  card: {
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
  },
  location: {
    fontSize: 15,
    color: colors.inkMuted,
  },
  counts: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
  },
  outlineButton: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
  group: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
