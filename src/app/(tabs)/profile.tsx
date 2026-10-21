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
import { colors } from "@/constants/theme";
import { links } from "@/constants/links";
import { useAuth } from "@/hooks/use-auth";
import { useFriends } from "@/hooks/use-friends";
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

function confirmSignOut(signOut: () => Promise<void>) {
  Alert.alert("Sign out?", undefined, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Sign out",
      onPress: () => void signOut().catch((error) =>
        Alert.alert("Couldn't sign out", error instanceof Error ? error.message : "Please try again."),
      ),
    },
  ]);
}

function confirmDeleteAccount(deleteAccount: () => Promise<void>) {
  Alert.alert(
    "Delete your account?",
    'This deletes your profile, books, and photo. Active requests are cancelled; request and message history stays, shown as "Deleted user". This can\'t be undone.',
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void deleteAccount().catch((error) =>
          Alert.alert(
            "Couldn't delete your account",
            error instanceof Error ? error.message : "Please try again.",
          ),
        ),
      },
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
  const { signOut, deleteAccount } = useAuth();
  const { books, loading: libraryLoading, error: libraryError } = useLibrary();
  const { friends, incoming } = useFriends();
  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.title}>Profile unavailable</Text>
      </SafeAreaView>
    );
  }
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
            {libraryLoading
              ? "Loading your library…"
              : libraryError
                ? "Could not load your library."
                : `${counts.total} ${counts.total === 1 ? "book" : "books"} · ${counts.available} available · ${counts.lent} lent`}
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
            label="Friends"
            icon="people-outline"
            detail={incoming.length > 0 ? `${incoming.length} new` : String(friends.length)}
            onPress={() => router.push("/friends")}
          />
          <SettingsRow
            label="Blocked users"
            icon="ban-outline"
            detail={blocked.length > 0 ? String(blocked.length) : undefined}
            onPress={() => router.push("/blocked-users")}
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            label="Sign out"
            icon="log-out-outline"
            onPress={() => confirmSignOut(signOut)}
          />
          <SettingsRow
            label="Delete account"
            icon="trash-outline"
            danger
            onPress={() => confirmDeleteAccount(deleteAccount)}
          />
        </SettingsGroup>
        <SettingsGroup>
          <SettingsRow label="Privacy policy" icon="document-text-outline" onPress={() => void openLink(links.privacy)} />
          <SettingsRow label="Terms" icon="document-text-outline" onPress={() => void openLink(links.terms)} />
        </SettingsGroup>
        <Text style={styles.privacy}>
          We value your trust. We do not sell, rent, trade, or share your
          personal information with any third parties for marketing,
          advertising, or commercial purposes.
        </Text>
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
  privacy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
    textAlign: "center",
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
