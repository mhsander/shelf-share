import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { BookCover } from "@/components/book-cover";
import { StarRating } from "@/components/star-rating";
import { StatusPill } from "@/components/status-pill";
import { colors } from "@/constants/theme";
import { sampleBooks } from "@/data/sample-books";
import { useFriends } from "@/hooks/use-friends";
import { visibleTo } from "@/lib/filter-books";

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const { friendIds } = useFriends();
  // TODO: replace with a Supabase query for one available `library_books` row (RLS applies visibility).
  const book = visibleTo(sampleBooks, friendIds).find((b) => b.id === id);

  const backButton = (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.iconButton}>
      <Ionicons name="chevron-back" size={22} color={colors.ink} />
    </Pressable>
  );

  if (!book) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>{backButton}</View>
        <Text style={styles.empty}>This book isn&apos;t available anymore.</Text>
      </SafeAreaView>
    );
  }

  const hasNote = book.personalRating !== null || book.personalReview !== null;

  function askToBorrow() {
    // TODO: call the `request_book` RPC (spec §7) with the optional message.
    Alert.alert("Not connected yet", "Borrow requests will work once the backend is wired up.");
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.topBar}>{backButton}</View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <BookCover color={book.coverColor} width={140} />
            <View style={styles.pills}>
              <StatusPill status="available" />
              {book.visibility === "friends" && (
                <View style={styles.friendsTag}>
                  <Ionicons name="people" size={14} color={colors.primary} />
                  <Text style={styles.friendsTagLabel}>Friends only</Text>
                </View>
              )}
            </View>
            <Text style={styles.title}>{book.title}</Text>
            <Text style={styles.author}>{book.author}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${book.ownerName}'s profile`}
            onPress={() => router.push({ pathname: "/user/[id]", params: { id: book.ownerId } })}
            style={({ pressed }) => [styles.ownerCard, pressed && styles.pressed]}
          >
            <Avatar name={book.ownerName} uri={null} size={44} />
            <View style={styles.ownerText}>
              <Text style={styles.ownerName}>{book.ownerName}</Text>
              <Text style={styles.ownerMeta}>
                {book.neighborhood} · {book.ownerBookCount} {book.ownerBookCount === 1 ? "book" : "books"} to lend
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.ink} />
          </Pressable>

          {hasNote && (
            <View style={styles.note}>
              <Text style={styles.label}>OWNER&apos;S NOTE</Text>
              {book.personalRating !== null && <StarRating value={book.personalRating} size={20} />}
              {book.personalReview !== null && <Text style={styles.review}>{book.personalReview}</Text>}
            </View>
          )}
        </ScrollView>

        <View style={styles.sheet}>
          <Text style={styles.sheetLabel}>Message to {book.ownerName} (optional)</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Hi! Could I borrow this? I can pick it up this weekend."
            placeholderTextColor={colors.placeholder}
            style={styles.messageInput}
            multiline
          />
          <Pressable
            accessibilityRole="button"
            onPress={askToBorrow}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonLabel}>Ask to borrow</Text>
          </Pressable>
          <Text style={styles.footnote}>Your email stays private. You&apos;ll arrange pickup in the app.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
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
    gap: 20,
  },
  hero: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.ink,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  author: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  pills: {
    flexDirection: "row",
    gap: 6,
  },
  friendsTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  friendsTagLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
  },
  ownerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
  },
  ownerText: {
    flex: 1,
    gap: 2,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
  },
  ownerMeta: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  note: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.inkMuted,
    letterSpacing: 0.5,
  },
  review: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  sheet: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  messageInput: {
    minHeight: 72,
    padding: 12,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    textAlignVertical: "top",
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  footnote: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
  },
  empty: {
    fontSize: 15,
    color: colors.inkMuted,
    textAlign: "center",
    paddingVertical: 32,
  },
});
