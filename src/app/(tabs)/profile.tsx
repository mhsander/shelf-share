import { router } from "expo-router";
import { Children, type ReactNode } from "react";
import {
  Alert,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { SettingsRow } from "@/components/settings-row";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useFriends } from "@/hooks/use-friends";
import { useLibrary } from "@/hooks/use-library";
import { useProfile } from "@/hooks/use-profile";
import { libraryCounts } from "@/lib/profile";

function showActionError(title: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Please try again.";
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function confirmAction(
  title: string,
  message: string | undefined,
  confirmLabel: string,
  onConfirm: () => Promise<void>,
  errorTitle: string,
  destructive = false,
) {
  const confirm = () =>
    void onConfirm().catch((error) => showActionError(errorTitle, error));

  if (Platform.OS === "web") {
    const prompt = [title, message].filter(Boolean).join("\n\n");
    if (window.confirm(prompt)) confirm();
    return;
  }

  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    {
      text: confirmLabel,
      style: destructive ? "destructive" : undefined,
      onPress: confirm,
    },
  ]);
}

function confirmSignOut(signOut: () => Promise<void>) {
  confirmAction(
    "Sign out?",
    undefined,
    "Sign out",
    signOut,
    "Couldn't sign out",
  );
}

function confirmDeleteAccount(deleteAccount: () => Promise<void>) {
  confirmAction(
    "Delete your account?",
    'This deletes your profile, books, and photo. Active requests are cancelled; request and message history stays, shown as "Deleted user". This can\'t be undone.',
    "Delete",
    deleteAccount,
    "Couldn't delete your account",
    true,
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
          <SettingsRow label="Privacy policy" icon="document-text-outline" onPress={() => router.push("/privacy")} />
          <SettingsRow label="Terms" icon="document-text-outline" onPress={() => router.push("/terms")} />
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
