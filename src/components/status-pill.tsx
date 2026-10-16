import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import type { BookStatus } from "@/types/book";

const pillStyles = {
  available: { label: "Available", background: colors.primarySoft, text: colors.primary },
  lent: { label: "Lent", background: colors.amberSoft, text: colors.amberInk },
  hidden: { label: "Hidden", background: colors.greySoft, text: colors.ink },
} satisfies Record<BookStatus, { label: string; background: string; text: string }>;

export function StatusPill({ status }: { status: BookStatus }) {
  const pill = pillStyles[status];
  return (
    <View style={[styles.pill, { backgroundColor: pill.background }]}>
      <Text style={[styles.label, { color: pill.text }]}>{pill.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
  },
});
