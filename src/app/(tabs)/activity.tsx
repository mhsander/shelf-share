import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { SectionList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCover } from "@/components/book-cover";
import { colors } from "@/constants/theme";
import { useBorrowRequests } from "@/hooks/use-requests";
import type { BorrowRequestSummary } from "@/hooks/use-requests";
import type { Database } from "@/types/database";

type RequestStatus = Database["public"]["Enums"]["request_status"];
const sections = [
  { title: "Needs a response", statuses: ["requested"] as RequestStatus[] },
  { title: "In progress", statuses: ["accepted", "lent"] as RequestStatus[] },
  { title: "Past requests", statuses: ["returned", "declined", "cancelled"] as RequestStatus[] },
] as const;

function statusText(request: BorrowRequestSummary) {
  switch (request.status) {
    case "requested":
      return request.role === "lender" ? `${request.counterpartName} wants to borrow` : "Request sent";
    case "accepted":
      return `Accepted · ${request.dueDate ? `due ${formatDate(request.dueDate)}` : "handoff pending"}`;
    case "lent":
      return `Lent · ${request.dueDate ? `due ${formatDate(request.dueDate)}` : "return pending"}`;
    case "returned":
      return "Returned";
    case "declined":
      return "Declined";
    case "cancelled":
      return "Cancelled";
  }
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function RequestRow({ request }: { request: BorrowRequestSummary }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${request.book.title}, ${statusText(request)}`}
      onPress={() => router.push({ pathname: "/requests/[id]", params: { id: request.id } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <BookCover color="blue" uri={request.book.coverUrl} />
      <View style={styles.text}>
        <Text style={styles.bookTitle} numberOfLines={1}>{request.book.title}</Text>
        <Text style={styles.author} numberOfLines={1}>{request.book.author}</Text>
        <Text style={styles.status} numberOfLines={1}>{statusText(request)}</Text>
        {request.latestMessage && (
          <Text style={styles.preview} numberOfLines={1}>{request.latestMessage}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
    </Pressable>
  );
}

export default function ActivityScreen() {
  const { data: requests = [], isLoading, error, refetch } = useBorrowRequests();
  const data = sections.map((section) => ({
    title: section.title,
    data: requests.filter((request) => section.statuses.includes(request.status)),
  })).filter((section) => section.data.length > 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <SectionList
        sections={data}
        keyExtractor={(request) => request.id}
        renderItem={({ item }) => <RequestRow request={item} />}
        renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={<Text style={styles.title}>Activity</Text>}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>
              {isLoading
                ? "Loading your requests…"
                : error
                  ? `Couldn't load activity: ${error.message}`
                  : "Borrow requests and loan updates will show up here."}
            </Text>
            {error && (
              <Pressable accessibilityRole="button" onPress={() => void refetch()}>
                <Text style={styles.retry}>Try again</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28, gap: 12 },
  title: { fontSize: 32, fontWeight: "900", color: colors.ink, marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.ink, marginTop: 12, marginBottom: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7 },
  text: { flex: 1, gap: 3 },
  bookTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
  author: { fontSize: 14, color: colors.inkMuted },
  status: { fontSize: 14, fontWeight: "700", color: colors.primary },
  preview: { fontSize: 13, color: colors.inkMuted },
  emptyWrap: { alignItems: "center", gap: 12, paddingVertical: 48 },
  empty: { fontSize: 15, lineHeight: 22, color: colors.inkMuted, textAlign: "center" },
  retry: { color: colors.primary, fontWeight: "800" },
});
