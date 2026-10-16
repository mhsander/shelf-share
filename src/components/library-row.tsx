import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BookCover, coverColorFor } from "@/components/book-cover";
import { StatusPill } from "@/components/status-pill";
import { colors } from "@/constants/theme";
import type { OwnedBook } from "@/types/book";

// "2026-11-06" -> "Nov 6". Parsed as a local date so it doesn't shift across time zones.
function formatDueDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusDetail(book: OwnedBook) {
  if (book.status === "lent" && book.lentTo) return `to ${book.lentTo.name} · due ${formatDueDate(book.lentTo.dueDate)}`;
  if (book.status === "hidden") return "Not shown to others";
  return null;
}

export function LibraryRow({ book, onMenu }: { book: OwnedBook; onMenu: () => void }) {
  const detail = statusDetail(book);

  return (
    <View style={styles.card}>
      <BookCover color={coverColorFor(book.id)} uri={book.coverUrl} width={44} />
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {book.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {book.author}
        </Text>
        <View style={styles.statusRow}>
          <StatusPill status={book.status} />
          {detail && (
            <Text style={styles.detail} numberOfLines={1}>
              {detail}
            </Text>
          )}
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Options for ${book.title}`} onPress={onMenu} hitSlop={8} style={styles.menu}>
        <Ionicons name="ellipsis-vertical" size={20} color={colors.inkMuted} />
      </Pressable>
    </View>
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
  text: {
    flex: 1,
    gap: 3,
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  detail: {
    flex: 1,
    fontSize: 13,
    color: colors.inkMuted,
  },
  menu: {
    padding: 4,
  },
});
