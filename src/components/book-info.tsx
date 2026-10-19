import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import type { BookInfo } from "@/types/book";

// Long blurbs start collapsed so the owner's note and the borrow button stay close.
const collapseOver = 280;

export function bookFacts(info: BookInfo): string {
  return [info.publisher, info.publishedYear, info.pageCount && `${info.pageCount} pages`].filter(Boolean).join(" · ");
}

// "About this book": publication details saved from the ISBN lookup. Renders nothing when empty.
export function BookInfoSection({ info }: { info: BookInfo | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!info) return null;

  const facts = bookFacts(info);
  if (!info.description && !facts && info.subjects.length === 0) return null;
  const collapsible = (info.description?.length ?? 0) > collapseOver;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>ABOUT THIS BOOK</Text>
      {facts !== "" && <Text style={styles.facts}>{facts}</Text>}
      {info.description && (
        <>
          <Text style={styles.description} numberOfLines={collapsible && !expanded ? 5 : undefined}>
            {info.description}
          </Text>
          {collapsible && (
            <Pressable accessibilityRole="button" onPress={() => setExpanded((open) => !open)} hitSlop={8}>
              <Text style={styles.toggle}>{expanded ? "Show less" : "Read more"}</Text>
            </Pressable>
          )}
        </>
      )}
      {info.subjects.length > 0 && (
        <View style={styles.subjects}>
          {info.subjects.map((subject) => (
            <View key={subject} style={styles.subject}>
              <Text style={styles.subjectLabel}>{subject}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.inkMuted,
    letterSpacing: 0.5,
  },
  facts: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  toggle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  subjects: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  subject: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.greySoft,
  },
  subjectLabel: {
    fontSize: 13,
    color: colors.ink,
  },
});
