import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCover } from "@/components/book-cover";
import { FormField } from "@/components/form-field";
import { SegmentedControl } from "@/components/segmented-control";
import { StarRating } from "@/components/star-rating";
import { colors } from "@/constants/theme";
import { useLibrary } from "@/hooks/use-library";
import { normalizeIsbn } from "@/lib/isbn";
import type { BookDetails, BookInfo, BookSource, BookVisibility } from "@/types/book";

// Add a book by hand, confirm a scanned one (prefilled from params), or edit one (`id` param).
type Params = {
  id?: string;
  isbn?: string;
  title?: string;
  author?: string;
  coverUrl?: string;
  // JSON-encoded BookInfo from a scan's lookup.
  info?: string;
  source?: BookSource;
};

function parseInfo(raw: string | undefined): BookInfo | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BookInfo;
  } catch {
    return null;
  }
}

type Errors = Partial<Record<"title" | "author" | "isbn" | "review", string>>;

const maxReviewLength = 5000;

const visibilityOptions: { value: BookVisibility; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "friends", label: "Friends only" },
];

export default function AddBookScreen() {
  const params = useLocalSearchParams<Params>();
  const { books, allFriendsOnly, addBook, updateBook } = useLibrary();
  const editing = params.id ? books.find((b) => b.id === params.id) : undefined;

  const [title, setTitle] = useState(editing?.title ?? params.title ?? "");
  const [author, setAuthor] = useState(editing?.author ?? params.author ?? "");
  const [isbn, setIsbn] = useState(editing?.isbn ?? params.isbn ?? "");
  const [rating, setRating] = useState<number | null>(editing?.personalRating ?? null);
  const [review, setReview] = useState(editing?.personalReview ?? "");
  const [visibility, setVisibility] = useState<BookVisibility>(editing?.visibility ?? "everyone");
  const [errors, setErrors] = useState<Errors>({});
  const coverUrl = editing?.coverUrl ?? (params.coverUrl || null);

  function save() {
    const next: Errors = {};
    const normalizedIsbn = isbn.trim() ? normalizeIsbn(isbn) : null;

    if (!title.trim()) next.title = "Add a title.";
    if (!author.trim()) next.author = "Add an author.";
    if (isbn.trim() && !normalizedIsbn) next.isbn = "That ISBN doesn't look right. Check the digits or leave it blank.";
    else if (normalizedIsbn && books.some((b) => b.isbn === normalizedIsbn && b.id !== editing?.id)) {
      next.isbn = "Already in your library.";
    }
    if (review.length > maxReviewLength) next.review = `Keep your review under ${maxReviewLength.toLocaleString("en-US")} characters.`;

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const details: BookDetails = {
      title: title.trim(),
      author: author.trim(),
      isbn: normalizedIsbn,
      coverUrl,
      personalRating: rating,
      personalReview: review.trim() || null,
      visibility,
    };

    if (editing) updateBook(editing.id, details);
    else addBook(details, params.source ?? "manual", parseInfo(params.info));
    router.back();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.heading}>{editing ? "Edit book" : "Add a book"}</Text>
        <View style={styles.iconButtonSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {coverUrl && (
            <View style={styles.cover}>
              <BookCover color="blue" uri={coverUrl} width={88} />
            </View>
          )}

          <FormField label="Title" value={title} onChangeText={setTitle} error={errors.title} returnKeyType="next" />
          <FormField label="Author" value={author} onChangeText={setAuthor} error={errors.author} returnKeyType="next" />
          <FormField
            label="ISBN (optional)"
            value={isbn}
            onChangeText={setIsbn}
            error={errors.isbn}
            keyboardType="number-pad"
            autoCorrect={false}
            placeholder="978…"
          />

          <View style={styles.ratingField}>
            <Text style={styles.label}>Your rating (optional)</Text>
            <StarRating value={rating} onChange={setRating} />
          </View>

          <FormField
            label="Your review (optional)"
            value={review}
            onChangeText={setReview}
            error={errors.review}
            multiline
            maxLength={maxReviewLength}
            placeholder="What did you think? Neighbors see this on the book's page."
            style={styles.review}
            textAlignVertical="top"
          />

          <View style={styles.ratingField}>
            <Text style={styles.label}>Who can see it</Text>
            {allFriendsOnly ? (
              <Text style={styles.hint}>Friends only. Your whole library is friends-only; change this in My library.</Text>
            ) : (
              <SegmentedControl options={visibilityOptions} value={visibility} onChange={setVisibility} />
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={save}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryLabel}>{editing ? "Save changes" : "Add to library"}</Text>
          </Pressable>
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
  form: {
    padding: 20,
    gap: 18,
  },
  cover: {
    alignItems: "center",
  },
  ratingField: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  review: {
    minHeight: 120,
  },
  hint: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  primaryButton: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  primaryLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  pressed: {
    opacity: 0.8,
  },
});
