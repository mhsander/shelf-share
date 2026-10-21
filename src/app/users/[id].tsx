import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { BookCard } from "@/components/book-card";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { usePublicProfile } from "@/hooks/use-books";
import { useFriends } from "@/hooks/use-friends";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { data: profile, isLoading, error } = usePublicProfile(id);
  const { friends, requests, sendRequest, accept, decline, cancelRequest } = useFriends();
  const [savingFriend, setSavingFriend] = useState(false);

  if (isLoading) return <MessageScreen message="Loading profile…" />;
  if (error) return <MessageScreen message={`Could not load this profile: ${error.message}`} />;
  if (!profile) return <MessageScreen message="This profile is unavailable." />;

  const location = [profile.neighborhood, profile.city].filter(Boolean).join(" · ");
  const isSelf = profile.id === session?.user.id;
  const friend = friends.some((item) => item.id === profile.id);
  const request = requests.find((item) => item.senderId === profile.id || item.recipientId === profile.id);

  async function runFriendAction(action: () => Promise<void>) {
    setSavingFriend(true);
    try {
      await action();
    } catch (friendError) {
      Alert.alert(
        "Couldn't update friend request",
        friendError instanceof Error ? friendError.message : "Please try again.",
      );
    } finally {
      setSavingFriend(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        data={profile.books}
        keyExtractor={(book) => book.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <BookCard book={item} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topBar}>
              <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.iconButton}>
                <Ionicons name="chevron-back" size={22} color={colors.ink} />
              </Pressable>
              <Text style={styles.topTitle}>Reader profile</Text>
              <View style={styles.iconButtonSpacer} />
            </View>
            <View style={styles.profileCard}>
              <Avatar name={profile.displayName} uri={profile.avatarUrl} size={72} />
              <Text style={styles.name}>{profile.displayName}</Text>
              <Text style={styles.location}>{location}</Text>
              <Text style={styles.count}>
                {profile.books.length} {profile.books.length === 1 ? "book" : "books"} available to lend
              </Text>
              {!isSelf && (
                <>
                  <View style={styles.friendActions}>
                    {friend ? (
                      <Text style={styles.friendStatus}>Friends</Text>
                    ) : request?.direction === "incoming" ? (
                      <>
                        <FriendButton
                          label="Accept request"
                          disabled={savingFriend}
                          onPress={() => void runFriendAction(() => accept(profile.id))}
                        />
                        <FriendButton
                          label="Decline"
                          disabled={savingFriend}
                          secondary
                          onPress={() => void runFriendAction(() => decline(profile.id))}
                        />
                      </>
                    ) : request ? (
                      <>
                        <Text style={styles.friendStatus}>Request pending</Text>
                        <FriendButton
                          label="Cancel request"
                          disabled={savingFriend}
                          secondary
                          onPress={() => void runFriendAction(() => cancelRequest(profile.id))}
                        />
                      </>
                    ) : (
                      <FriendButton
                        label="Add friend"
                        disabled={savingFriend}
                        onPress={() => void runFriendAction(() => sendRequest(profile))}
                      />
                    )}
                  </View>
                  <FriendButton
                    label="Report user"
                    disabled={savingFriend}
                    secondary
                    onPress={() =>
                      router.push({ pathname: "/report/[userId]", params: { userId: profile.id } })
                    }
                  />
                </>
              )}
            </View>
            <Text style={styles.sectionTitle}>Available books</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No available books right now.</Text>}
      />
    </SafeAreaView>
  );
}

function FriendButton({
  label,
  disabled,
  secondary = false,
  onPress,
}: {
  label: string;
  disabled: boolean;
  secondary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.friendButton,
        secondary && styles.friendButtonSecondary,
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text style={[styles.friendButtonLabel, secondary && styles.friendButtonLabelSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MessageScreen({ message }: { message: string }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.empty}>{message}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  header: { gap: 16, marginBottom: 14 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
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
  iconButtonSpacer: { width: 44 },
  topTitle: { fontSize: 18, fontWeight: "800", color: colors.ink },
  profileCard: {
    alignItems: "center",
    gap: 8,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  name: { fontSize: 23, fontWeight: "900", color: colors.ink },
  location: { fontSize: 15, color: colors.inkMuted },
  count: { marginTop: 4, fontSize: 14, fontWeight: "600", color: colors.ink },
  friendActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 6 },
  friendStatus: { alignSelf: "center", color: colors.primary, fontWeight: "700" },
  friendButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primary },
  friendButtonSecondary: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  friendButtonLabel: { color: colors.onPrimary, fontWeight: "700" },
  friendButtonLabelSecondary: { color: colors.ink },
  dimmed: { opacity: 0.55 },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: colors.ink },
  separator: { height: 10 },
  empty: { padding: 24, color: colors.inkMuted, textAlign: "center" },
});
