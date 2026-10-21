import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { BookCover } from "@/components/book-cover";
import { StarRating } from "@/components/star-rating";
import { StatusPill } from "@/components/status-pill";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useBookDetails } from "@/hooks/use-books";
import { queryClient } from "@/lib/query-client";
import { requireSupabase } from "@/lib/supabase";

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { data: book, isLoading, error } = useBookDetails(id);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const requestable = book?.status === "available" && book.ownerId !== session?.user.id;

  async function requestBook() {
    if (!id || !session || sending) return;
    setSending(true);
    try {
      const client = requireSupabase();
      const { data: requestId, error: requestError } = await client.rpc("request_book", {
        p_book_id: id,
      });
      if (requestError) throw requestError;
      if (message.trim()) {
        const { error: messageError } = await client.from("request_messages").insert({
          request_id: requestId,
          sender_id: session.user.id,
          body: message.trim(),
        });
        if (messageError) {
          Alert.alert(
            "Request sent, but message failed",
            `Your borrow request was sent. The message could not be saved: ${messageError.message}`,
          );
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["activity", session.user.id] });
      if (!message.trim()) Alert.alert("Request sent", "The owner has been notified.");
      router.back();
    } catch (requestError) {
      Alert.alert(
        "Couldn't request this book",
        requestError instanceof Error ? requestError.message : "Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  if (isLoading) return <MessageScreen message="Loading book…" />;
  if (error) return <MessageScreen message={`Could not load this book: ${error.message}`} />;
  if (!book) return <MessageScreen message="This book is no longer available." />;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>{book.title}</Text>
        <View style={styles.iconButtonSpacer} />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.cover}>
            <BookCover color="blue" uri={book.coverUrl} width={172} />
          </View>
          <StatusPill status={book.status} />
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.author}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/users/[id]", params: { id: book.ownerId } })}
            style={styles.ownerCard}
          >
            <Avatar name={book.owner.displayName} uri={book.owner.avatarUrl} size={48} />
            <View style={styles.ownerText}>
              <Text style={styles.ownerName}>{book.owner.displayName}</Text>
              <Text style={styles.location}>
                {[book.owner.neighborhood, book.owner.city].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
          </Pressable>
          {(book.personalRating !== null || book.personalReview) && (
            <View style={styles.note}>
              <Text style={styles.label}>OWNER&apos;S NOTE</Text>
              {book.personalRating !== null && (
                <StarRating value={book.personalRating} onChange={() => undefined} />
              )}
              {book.personalReview && <Text style={styles.review}>{book.personalReview}</Text>}
            </View>
          )}
        </ScrollView>
        <View style={styles.footer}>
          <Text style={styles.label}>Message to {book.owner.displayName} (optional)</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Hi! Could I borrow this?"
            placeholderTextColor={colors.placeholder}
            style={styles.message}
            multiline
            maxLength={2000}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!requestable || sending}
            onPress={() => void requestBook()}
            style={({ pressed }) => [
              styles.requestButton,
              (pressed || !requestable || sending) && styles.dimmed,
            ]}
          >
            {sending ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.requestLabel}>
                {book.ownerId === session?.user.id
                  ? "Your book"
                  : book.status === "available"
                    ? "Ask to borrow"
                    : "Unavailable"}
              </Text>
            )}
          </Pressable>
          <Text style={styles.privacy}>Your email stays private. Arrange pickup in the app.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  iconButtonSpacer: { width: 44 },
  topTitle: { flex: 1, marginHorizontal: 12, textAlign: "center", fontWeight: "800", color: colors.ink },
  content: { padding: 20, gap: 12, paddingBottom: 30 },
  cover: { alignItems: "center", marginVertical: 8 },
  title: { fontSize: 28, fontWeight: "900", color: colors.ink, textAlign: "center" },
  author: { fontSize: 17, color: colors.inkMuted, textAlign: "center" },
  ownerCard: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ownerText: { flex: 1, gap: 3 },
  ownerName: { fontSize: 16, fontWeight: "800", color: colors.ink },
  location: { fontSize: 14, color: colors.inkMuted },
  note: { gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.surface },
  label: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5, color: colors.inkMuted },
  review: { fontSize: 15, lineHeight: 22, color: colors.ink },
  footer: {
    gap: 9,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  message: {
    minHeight: 54,
    maxHeight: 100,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.ink,
    textAlignVertical: "top",
  },
  requestButton: {
    height: 52,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  requestLabel: { color: colors.onPrimary, fontWeight: "800", fontSize: 16 },
  dimmed: { opacity: 0.5 },
  privacy: { fontSize: 12, textAlign: "center", color: colors.inkMuted },
  empty: { padding: 24, color: colors.inkMuted, textAlign: "center" },
});
