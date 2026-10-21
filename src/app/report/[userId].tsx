import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { requireSupabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ReportReason = Database["public"]["Enums"]["report_reason"];

const reasons: { value: ReportReason; label: string }[] = [
  { value: "not_returned", label: "Book not returned" },
  { value: "damaged", label: "Book was damaged" },
  { value: "harassment", label: "Harassment or unsafe behavior" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Something else" },
];

export default function ReportScreen() {
  const { userId, requestId } = useLocalSearchParams<{
    userId: string;
    requestId?: string;
  }>();
  const { session } = useAuth();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!session || !userId || !reason || sending) return;
    setSending(true);
    try {
      const { error } = await requireSupabase().rpc("submit_report", {
        p_reported_user_id: userId,
        p_reason: reason,
        p_details: details.trim() || null,
        p_request_id: requestId ?? null,
      });
      if (error) throw error;
      Alert.alert("Report submitted", "Thank you. Your report has been submitted.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(
        "Couldn't submit your report",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.back}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>Report user</Text>
        <Text style={styles.description}>
          Reports are private; only authorized moderators can review them.
          Choose the reason that best describes your concern.
        </Text>
        <View style={styles.reasons}>
          {reasons.map((item) => {
            const selected = reason === item.value;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setReason(item.value)}
                style={[styles.reason, selected && styles.reasonSelected]}
              >
                <Text style={[styles.reasonLabel, selected && styles.reasonLabelSelected]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.label}>Additional details (optional)</Text>
        <TextInput
          accessibilityLabel="Additional details"
          value={details}
          onChangeText={setDetails}
          placeholder="Share any context that may help us review this report."
          placeholderTextColor={colors.placeholder}
          multiline
          maxLength={2000}
          textAlignVertical="top"
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!reason || sending}
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.submit,
            (!reason || sending || pressed) && styles.disabled,
          ]}
        >
          {sending ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.submitLabel}>Submit report</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  back: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  title: { color: colors.ink, fontSize: 30, fontWeight: "900" },
  description: { color: colors.inkMuted, fontSize: 15, lineHeight: 22 },
  reasons: { gap: 8 },
  reason: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reasonSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  reasonLabel: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  reasonLabelSelected: { color: colors.onPrimary },
  label: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  input: {
    minHeight: 120,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  submit: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.primary,
  },
  submitLabel: { color: colors.onPrimary, fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.5 },
});
