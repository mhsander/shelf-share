import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCard } from "@/components/book-card";
import { FilterChip } from "@/components/filter-chip";
import { colors } from "@/constants/theme";
import { sampleBooks } from "@/data/sample-books";
import { filterBooks } from "@/lib/filter-books";

// TODO: replace with the signed-in user's profile city.
const userCity = "Seattle";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const books = filterBooks(sampleBooks, query);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        data={books}
        keyExtractor={(book) => book.id}
        renderItem={({ item }) => <BookCard book={item} />}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Find a book</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={styles.iconButton}>
                <Ionicons name="notifications-outline" size={22} color={colors.ink} />
              </Pressable>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color={colors.ink} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Title or author"
                placeholderTextColor={colors.placeholder}
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
              />
            </View>

            <View style={styles.chips}>
              <FilterChip label={userCity} selected />
              <FilterChip label="Any neighborhood" />
              <FilterChip label="Available now" />
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>New in your city</Text>
              <Pressable accessibilityRole="button">
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No books match your search yet.</Text>}
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
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.5,
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
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.ink,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
  },
  seeAll: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  empty: {
    fontSize: 15,
    color: colors.inkMuted,
    textAlign: "center",
    paddingVertical: 32,
  },
});
