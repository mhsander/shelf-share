import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BookCover } from "@/components/book-cover";
import { colors } from "@/constants/theme";
import type { ListedBook } from "@/types/book";

export function BookCard({ book }: { book: ListedBook }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${book.title} by ${book.author}`}
      onPress={() => router.push({ pathname: "/books/[id]", params: { id: book.id } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <BookCover color={book.coverColor} uri={book.coverUrl} />
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {book.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {book.author}
        </Text>
        <Text style={styles.owner} numberOfLines={1}>
          {book.ownerName} · {book.neighborhood}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
  },
  author: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  owner: {
    fontSize: 13,
    color: colors.inkMuted,
  },
});
