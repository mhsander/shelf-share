import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState, type ComponentProps } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LibraryRow } from "@/components/library-row";
import { SegmentedControl } from "@/components/segmented-control";
import { colors } from "@/constants/theme";
import { useLibrary } from "@/hooks/use-library";
import { filterByStatus, type StatusFilter } from "@/lib/library";
import type { OwnedBook } from "@/types/book";

const filters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "lent", label: "Lent" },
  { value: "hidden", label: "Hidden" },
];

type TileProps = {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

function ActionTile({ icon, label, primary = false, disabled = false, onPress }: TileProps) {
  const tint = primary ? colors.onPrimary : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, primary && styles.tilePrimary, (pressed || disabled) && styles.dimmed]}
    >
      <Ionicons name={icon} size={24} color={tint} />
      <Text style={[styles.tileLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

export default function LibraryScreen() {
  const { books, setStatus, removeBook } = useLibrary();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const visible = filterByStatus(books, filter);

  function openMenu(book: OwnedBook) {
    const edit = { text: "Edit details", onPress: () => router.push({ pathname: "/add-book", params: { id: book.id } }) };
    const cancel = { text: "Cancel", style: "cancel" as const };

    if (book.status === "lent") {
      Alert.alert(book.title, "This book is lent out. You can hide or remove it once it's returned.", [edit, cancel]);
      return;
    }

    const toggle =
      book.status === "hidden"
        ? { text: "Show to others", onPress: () => setStatus(book.id, "available") }
        : { text: "Hide from others", onPress: () => setStatus(book.id, "hidden") };
    const remove = {
      text: "Remove from library",
      style: "destructive" as const,
      onPress: () =>
        Alert.alert("Remove this book?", `"${book.title}" will be deleted from your library.`, [
          cancel,
          { text: "Remove", style: "destructive", onPress: () => removeBook(book.id) },
        ]),
    };
    Alert.alert(book.title, undefined, [edit, toggle, remove, cancel]);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        data={visible}
        keyExtractor={(book) => book.id}
        renderItem={({ item }) => <LibraryRow book={item} onMenu={() => openMenu(item)} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>My library</Text>
              <Text style={styles.count}>
                {books.length} {books.length === 1 ? "book" : "books"}
              </Text>
            </View>

            <View style={styles.tiles}>
              <ActionTile icon="scan-outline" label="Scan" primary onPress={() => router.push("/scan")} />
              <ActionTile icon="create-outline" label="Type it in" onPress={() => router.push("/add-book")} />
              {/* TODO: Goodreads CSV import (spec §6.3). */}
              <ActionTile icon="download-outline" label="Import CSV" disabled />
            </View>

            <SegmentedControl options={filters} value={filter} onChange={setFilter} />
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {filter === "all" ? "No books yet. Scan one to get started." : `No ${filter} books.`}
          </Text>
        }
      />
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
    paddingBottom: 24,
    gap: 12,
  },
  header: {
    gap: 16,
    paddingTop: 16,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  count: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  tiles: {
    flexDirection: "row",
    gap: 8,
  },
  tile: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  tilePrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tileLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  dimmed: {
    opacity: 0.5,
  },
  empty: {
    fontSize: 15,
    color: colors.inkMuted,
    textAlign: "center",
    paddingVertical: 32,
  },
});
