import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { colors } from "@/constants/theme";
import { samplePeople } from "@/data/sample-people";
import { useFriends } from "@/hooks/use-friends";

// Opened from an invite link. Accepting sends a friend request to the inviter (or makes you
// friends if they already asked you).
export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { relationshipWith, sendRequest } = useFriends();
  // TODO: resolve the code with the `accept_friend_invite` RPC; sample codes are person ids.
  const inviter = samplePeople.find((p) => p.id === code);

  if (!inviter) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.body}>This invite link isn&apos;t valid anymore.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace("/")} style={styles.secondary}>
          <Text style={styles.secondaryLabel}>Go to search</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const relationship = relationshipWith(inviter.id);
  const name = inviter.displayName;

  function addFriend() {
    sendRequest(inviter!);
    router.replace({ pathname: "/user/[id]", params: { id: inviter!.id } });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Avatar name={name} uri={inviter.avatarUrl} size={88} />
        <Text style={styles.title}>{name} invited you</Text>
        <Text style={styles.body}>
          {relationship === "friends"
            ? `You and ${name} are already friends.`
            : `Become friends to see each other's friends-only books.`}
        </Text>
        {relationship === "friends" || relationship === "requestSent" ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace({ pathname: "/user/[id]", params: { id: inviter.id } })}
            style={styles.primary}
          >
            <Text style={styles.primaryLabel}>See {name}&apos;s books</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={addFriend} style={styles.primary}>
            <Text style={styles.primaryLabel}>Add {name} as a friend</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.secondary}>
          <Text style={styles.secondaryLabel}>Not now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: colors.background,
  },
  card: {
    alignItems: "center",
    gap: 12,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.ink,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    color: colors.inkMuted,
    textAlign: "center",
  },
  primary: {
    alignSelf: "stretch",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  secondary: {
    alignSelf: "stretch",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
});
