import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { BookCard } from "@/components/book-card";
import { colors } from "@/constants/theme";
import { sampleBooks } from "@/data/sample-books";
import { samplePeople } from "@/data/sample-people";
import { useFriends } from "@/hooks/use-friends";
import { visibleTo } from "@/lib/filter-books";
import type { Person } from "@/types/friends";

// Another user's profile: public fields, their visible books, and friend actions (spec §6.5).
export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { friendIds } = useFriends();
  // TODO: replace with Supabase queries for the profile and their visible `library_books`.
  const person = samplePeople.find((p) => p.id === id);
  const books = visibleTo(sampleBooks, friendIds).filter((b) => b.ownerId === id);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
      </View>

      {person ? (
        <FlatList
          data={books}
          keyExtractor={(book) => book.id}
          renderItem={({ item }) => <BookCard book={item} />}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.header}>
              <Avatar name={person.displayName} uri={person.avatarUrl} size={88} />
              <Text style={styles.name}>{person.displayName}</Text>
              <Text style={styles.location}>{[person.neighborhood, person.city].filter(Boolean).join(" · ")}</Text>
              <FriendActions person={person} />
              <Text style={styles.sectionTitle}>Books to lend</Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.empty}>No books you can see right now.</Text>}
        />
      ) : (
        <Text style={styles.empty}>This profile isn&apos;t available.</Text>
      )}
    </SafeAreaView>
  );
}

function FriendActions({ person }: { person: Person }) {
  const { relationshipWith, sendRequest, accept, decline, cancelRequest, removeFriend } = useFriends();
  const name = person.displayName;

  switch (relationshipWith(person.id)) {
    case "none":
      return <ActionButton label="Add friend" icon="person-add-outline" primary onPress={() => sendRequest(person)} />;
    case "requestSent":
      return (
        <ActionButton
          label="Request sent"
          icon="time-outline"
          onPress={() =>
            Alert.alert(`Cancel your request to ${name}?`, undefined, [
              { text: "Keep it", style: "cancel" },
              { text: "Cancel request", style: "destructive", onPress: () => cancelRequest(person.id) },
            ])
          }
        />
      );
    case "requestReceived":
      return (
        <View style={styles.actionRow}>
          <ActionButton label="Decline" onPress={() => decline(person.id)} />
          <ActionButton label="Accept" icon="checkmark" primary onPress={() => accept(person.id)} />
        </View>
      );
    case "friends":
      return (
        <ActionButton
          label="Friends"
          icon="checkmark"
          onPress={() =>
            Alert.alert(`Remove ${name} as a friend?`, "You'll stop seeing each other's friends-only books.", [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: () => removeFriend(person.id) },
            ])
          }
        />
      );
  }
}

type ActionButtonProps = {
  label: string;
  icon?: "person-add-outline" | "time-outline" | "checkmark";
  primary?: boolean;
  onPress: () => void;
};

function ActionButton({ label, icon, primary = false, onPress }: ActionButtonProps) {
  const tint = primary ? colors.onPrimary : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, primary && styles.actionPrimary, pressed && styles.pressed]}
    >
      {icon && <Ionicons name={icon} size={18} color={tint} />}
      <Text style={[styles.actionLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  header: {
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  name: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.ink,
    marginTop: 6,
  },
  location: {
    fontSize: 15,
    color: colors.inkMuted,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    paddingHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  actionPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.7,
  },
  sectionTitle: {
    alignSelf: "flex-start",
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 18,
  },
  empty: {
    fontSize: 15,
    color: colors.inkMuted,
    textAlign: "center",
    paddingVertical: 32,
  },
});
