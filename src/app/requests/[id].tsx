import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { BookCover } from "@/components/book-cover";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { invalidateBorrowRequests, useBorrowRequest } from "@/hooks/use-requests";
import { requireSupabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type RequestStatus = Database["public"]["Enums"]["request_status"];
const progress: RequestStatus[] = ["requested", "accepted", "lent", "returned"];

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { data: request, isLoading, error, refetch } = useBorrowRequest(id);
  const [draft, setDraft] = useState("");
  const [working, setWorking] = useState(false);

  async function runAction(action: () => Promise<void>) {
    if (working) return;
    setWorking(true);
    try {
      await action();
      await invalidateBorrowRequests(id);
      setDraft("");
    } catch (actionError) {
      Alert.alert("Couldn't update this request", actionError instanceof Error ? actionError.message : "Please try again.");
    } finally {
      setWorking(false);
    }
  }

  async function sendMessage() {
    const body = draft.trim();
    if (!body || body.length > 2000 || !request || !session) return;
    await runAction(async () => {
      const { error: insertError } = await requireSupabase().from("request_messages").insert({
        request_id: request.id,
        sender_id: session.user.id,
        body,
      });
      if (insertError) throw insertError;
    });
  }

  async function changeStatus(actionName: "accept" | "decline" | "cancel" | "lent" | "returned") {
    if (!request) return;
    await runAction(async () => {
      const client = requireSupabase();
      const result = actionName === "accept" || actionName === "decline"
        ? await client.rpc("respond_to_request", {
            p_request_id: request.id,
            p_response: actionName === "accept" ? "accepted" : "declined",
          })
        : actionName === "cancel"
          ? await client.rpc("cancel_request", { p_request_id: request.id })
          : actionName === "lent"
            ? await client.rpc("mark_lent", { p_request_id: request.id })
            : await client.rpc("mark_returned", { p_request_id: request.id });
      if (result.error) throw result.error;
    });
  }

  if (isLoading) return <MessageScreen message="Loading request…" />;
  if (error) {
    return (
      <MessageScreen
        message={`Couldn't load this request: ${error.message}`}
        actionLabel="Try again"
        onAction={() => void refetch()}
      />
    );
  }
  if (!request) return <MessageScreen message="This request isn't available." />;

  const userId = session?.user.id;
  const isLender = request.lenderId === userId;
  const terminal = ["returned", "declined", "cancelled"].includes(request.status);
  const counterpart = request.role === "lender" ? request.borrowerName : request.lenderName;
  const currentStep = progress.indexOf(request.status);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.topTitle}>Borrow request</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Request options"
            onPress={() =>
              Alert.alert("Request options", undefined, [
                {
                  text: "Report user",
                  onPress: () =>
                    router.push({
                      pathname: "/report/[userId]",
                      params: {
                        userId: request.borrowerId === session?.user.id
                          ? request.lenderId
                          : request.borrowerId,
                        requestId: request.id,
                      },
                    }),
                },
                { text: "Cancel", style: "cancel" },
              ])
            }
            style={styles.iconButton}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.ink} />
          </Pressable>
        </View>

        <FlatList
          data={request.messages}
          keyExtractor={(message) => message.id}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.bookHeader}>
                <BookCover color="blue" uri={request.book.coverUrl} width={48} />
                <View style={styles.bookText}>
                  <Text style={styles.bookTitle} numberOfLines={1}>{request.book.title}</Text>
                  <Text style={styles.subtitle}>
                    {request.role === "lender" ? `${counterpart} wants to borrow` : `Borrow request to ${counterpart}`}
                  </Text>
                </View>
              </View>
              <View accessibilityLabel={`Request status: ${request.status}`} style={styles.progress}>
                {progress.map((step, index) => (
                  <View key={step} style={styles.step}>
                    <View style={[
                      styles.stepDot,
                      index <= currentStep && styles.stepDotDone,
                      index === currentStep && styles.stepDotCurrent,
                    ]} />
                    <Text style={[styles.stepLabel, index === currentStep && styles.stepLabelCurrent]}>
                      {capitalize(step)}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.banner}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={styles.bannerText}>{bannerText(request.status, request.dueDate, isLender)}</Text>
              </View>
              <Text style={styles.threadTitle}>Messages</Text>
            </View>
          }
          renderItem={({ item }) => {
            const own = item.senderId === userId;
            return (
              <View style={[styles.messageRow, own && styles.messageRowOwn]}>
                {!own && <Avatar name={item.senderName} uri={null} size={30} />}
                <View style={[styles.messageBubble, own ? styles.messageOwn : styles.messageOther]}>
                  {!own && <Text style={styles.senderName}>{item.senderName}</Text>}
                  <Text style={[styles.messageText, own && styles.messageTextOwn]}>{item.body}</Text>
                  <Text style={[styles.messageTime, own && styles.messageTimeOwn]}>{formatTime(item.createdAt)}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.noMessages}>No messages yet. Arrange a time and place for the handoff here.</Text>}
          ListFooterComponent={<View style={{ height: 12 }} />}
        />

        {!terminal && (
          <View style={styles.composer}>
            <TextInput
              accessibilityLabel={`Message ${counterpart}`}
              value={draft}
              onChangeText={setDraft}
              placeholder={`Message ${counterpart}`}
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              multiline
              maxLength={2000}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              disabled={!draft.trim() || working}
              onPress={() => void sendMessage()}
              style={({ pressed }) => [styles.sendButton, (!draft.trim() || working || pressed) && styles.disabled]}
            >
              {working ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="send" size={18} color={colors.onPrimary} />}
            </Pressable>
          </View>
        )}

        {!terminal && (
          <View style={styles.actions}>
            {request.status === "requested" && isLender && (
              <>
                <ActionButton label="Decline" secondary disabled={working} onPress={() => void changeStatus("decline")} />
                <ActionButton label="Accept · due in 3 weeks" disabled={working} onPress={() => void changeStatus("accept")} />
              </>
            )}
            {request.status === "requested" && !isLender && (
              <ActionButton label="Cancel request" secondary disabled={working} onPress={() => void changeStatus("cancel")} />
            )}
            {request.status === "accepted" && (
              <>
                <ActionButton label="Cancel request" secondary disabled={working} onPress={() => void changeStatus("cancel")} />
                {isLender && <ActionButton label="Mark as lent" disabled={working} onPress={() => void changeStatus("lent")} />}
              </>
            )}
            {request.status === "lent" && isLender && (
              <ActionButton label="Mark as returned" disabled={working} onPress={() => void changeStatus("returned")} />
            )}
          </View>
        )}
        {terminal && (
          <View style={styles.terminal}>
            <Text style={styles.terminalText}>{bannerText(request.status, request.dueDate, isLender)}</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ActionButton({
  label,
  secondary = false,
  disabled,
  onPress,
}: {
  label: string;
  secondary?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        secondary && styles.actionSecondary,
        (pressed || disabled) && styles.disabled,
      ]}
    >
      <Text style={[styles.actionLabel, secondary && styles.actionLabelSecondary]}>{label}</Text>
    </Pressable>
  );
}

function MessageScreen({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.messageState}>
        <Text style={styles.subtitle}>{message}</Text>
        {actionLabel && onAction && (
          <Pressable accessibilityRole="button" onPress={onAction}>
            <Text style={styles.retry}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function bannerText(status: RequestStatus, dueDate: string | null, isLender: boolean) {
  if (status === "requested") return isLender ? "A borrower is waiting for your response." : "Waiting for the lender to respond.";
  if (status === "accepted") return `Accepted · due back ${dueDate ? formatDate(dueDate) : "in 3 weeks"}.`;
  if (status === "lent") return `Book lent · due back ${dueDate ? formatDate(dueDate) : "soon"}.`;
  if (status === "returned") return "This book has been returned.";
  if (status === "declined") return "This request was declined.";
  return "This request was cancelled.";
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconButton: {
    width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  iconButtonSpacer: { width: 44 },
  topTitle: { fontSize: 17, fontWeight: "800", color: colors.ink },
  content: { padding: 20, gap: 14, flexGrow: 1 },
  header: { gap: 16, marginBottom: 8 },
  bookHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  bookText: { flex: 1, gap: 4 },
  bookTitle: { fontSize: 18, fontWeight: "900", color: colors.ink },
  subtitle: { fontSize: 14, color: colors.inkMuted },
  progress: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  step: { flex: 1, alignItems: "center", gap: 6 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.borderStrong },
  stepDotDone: { backgroundColor: colors.primary },
  stepDotCurrent: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: colors.primarySoft },
  stepLabel: { fontSize: 11, color: colors.inkMuted },
  stepLabelCurrent: { fontWeight: "800", color: colors.ink },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.primarySoft },
  bannerText: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.ink },
  threadTitle: { fontSize: 18, fontWeight: "800", color: colors.ink, marginTop: 4 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 10 },
  messageRowOwn: { justifyContent: "flex-end" },
  messageBubble: { maxWidth: "82%", paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16, gap: 4 },
  messageOther: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  messageOwn: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  senderName: { fontSize: 12, fontWeight: "800", color: colors.inkMuted },
  messageText: { fontSize: 15, lineHeight: 21, color: colors.ink },
  messageTextOwn: { color: colors.onPrimary },
  messageTime: { alignSelf: "flex-end", fontSize: 10, color: colors.inkMuted },
  messageTimeOwn: { color: "#DDEAE2" },
  noMessages: { paddingVertical: 20, fontSize: 14, lineHeight: 20, textAlign: "center", color: colors.inkMuted },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingTop: 10 },
  input: {
    flex: 1, maxHeight: 100, minHeight: 44, paddingHorizontal: 13, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 22, backgroundColor: colors.surface,
    color: colors.ink,
  },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  disabled: { opacity: 0.45 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  action: { flexGrow: 1, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderRadius: 13, backgroundColor: colors.primary },
  actionSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.ink },
  actionLabel: { fontSize: 14, fontWeight: "800", color: colors.onPrimary },
  actionLabelSecondary: { color: colors.ink },
  terminal: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  terminalText: { textAlign: "center", color: colors.inkMuted, fontWeight: "700" },
  messageState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  retry: { fontSize: 15, fontWeight: "800", color: colors.primary },
});
