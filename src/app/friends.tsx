import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { colors } from "@/constants/theme";
import { useFriends } from "@/hooks/use-friends";
import { inviteMessage } from "@/lib/invite";
import type { Person } from "@/types/friends";

// TODO: create a code with the `create_friend_invite` RPC instead of this placeholder.
const sampleInviteCode = "sample-invite";

async function shareInvite() {
  try {
    await Share.share({ message: inviteMessage(sampleInviteCode) });
  } catch {
    Alert.alert("Couldn't open the share sheet.");
  }
}

function PersonRow({ person, children }: { person: Person; children?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${person.displayName}'s profile`}
        onPress={() => router.push({ pathname: "/users/[id]", params: { id: person.id } })}
        style={styles.person}
      >
        <Avatar name={person.displayName} uri={person.avatarUrl} size={40} />
        <View style={styles.personText}>
          <Text style={styles.name}>{person.displayName}</Text>
          {person.neighborhood && <Text style={styles.meta}>{person.neighborhood}</Text>}
        </View>
      </Pressable>
      {children}
    </View>
  );
}

function SmallButton({ label, accessibilityLabel, primary = false, onPress }: { label: string; accessibilityLabel: string; primary?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.small, primary && styles.smallPrimary, pressed && styles.pressed]}
    >
      <Text style={[styles.smallLabel, primary && styles.smallPrimaryLabel]}>{label}</Text>
    </Pressable>
  );
}

export default function FriendsScreen() {
  const { friends, incoming, outgoing, accept, decline, cancelRequest } = useFriends();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.heading}>Friends</Text>
        <View style={styles.iconButtonSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Invite friends"
          onPress={shareInvite}
          style={({ pressed }) => [styles.invite, pressed && styles.pressed]}
        >
          <Ionicons name="share-outline" size={20} color={colors.onPrimary} />
          <Text style={styles.inviteLabel}>Invite friends</Text>
        </Pressable>
        <Text style={styles.hint}>Find people from a book&apos;s page too: tap the owner, then Add friend.</Text>

        {incoming.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requests</Text>
            {incoming.map((person) => (
              <PersonRow key={person.id} person={person}>
                <SmallButton label="Decline" accessibilityLabel={`Decline ${person.displayName}`} onPress={() => decline(person.id)} />
                <SmallButton label="Accept" accessibilityLabel={`Accept ${person.displayName}`} primary onPress={() => accept(person.id)} />
              </PersonRow>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your friends</Text>
          {friends.length === 0 ? (
            <Text style={styles.empty}>No friends yet. Invite someone to start sharing books.</Text>
          ) : (
            friends.map((person) => <PersonRow key={person.id} person={person} />)
          )}
        </View>

        {outgoing.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sent</Text>
            {outgoing.map((person) => (
              <PersonRow key={person.id} person={person}>
                <SmallButton
                  label="Cancel"
                  accessibilityLabel={`Cancel request to ${person.displayName}`}
                  onPress={() => cancelRequest(person.id)}
                />
              </PersonRow>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  heading: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconButtonSpacer: {
    width: 44,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  invite: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  inviteLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  hint: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  person: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  personText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  meta: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  small: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  smallPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  smallLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  smallPrimaryLabel: {
    color: colors.onPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
  empty: {
    fontSize: 15,
    color: colors.inkMuted,
    paddingVertical: 8,
  },
});
