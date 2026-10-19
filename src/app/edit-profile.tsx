import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FormField } from "@/components/form-field";
import { colors } from "@/constants/theme";
import { useProfile } from "@/hooks/use-profile";
import { validateProfile } from "@/lib/profile";
import type { ProfileDraft } from "@/types/profile";

type Field = keyof ProfileDraft;

export default function EditProfileScreen() {
  const { profile, updateProfile } = useProfile();
  const [draft, setDraft] = useState<ProfileDraft>({
    displayName: profile.displayName,
    city: profile.city,
    neighborhood: profile.neighborhood ?? "",
  });
  // Errors show only for fields the user has edited.
  const [touched, setTouched] = useState<Set<Field>>(new Set());

  const result = validateProfile(draft);
  const errors = result.ok ? {} : result.errors;

  function change(field: Field) {
    return (text: string) => {
      setDraft((d) => ({ ...d, [field]: text }));
      setTouched((t) => new Set(t).add(field));
    };
  }

  function save() {
    if (!result.ok) return;
    updateProfile(result.profile);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.textButton} hitSlop={8}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.heading}>Edit profile</Text>
        <View style={styles.textButton} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <FormField
            label="Display name"
            value={draft.displayName}
            onChangeText={change("displayName")}
            error={touched.has("displayName") ? errors.displayName : null}
            autoComplete="name"
            returnKeyType="next"
          />
          <FormField
            label="City"
            value={draft.city}
            onChangeText={change("city")}
            error={touched.has("city") ? errors.city : null}
            returnKeyType="next"
          />
          <FormField
            label="Neighborhood (optional)"
            value={draft.neighborhood}
            onChangeText={change("neighborhood")}
            placeholder="Helps neighbors plan a pickup"
          />
          <Text style={styles.note}>Neighbors see your name, city, and neighborhood. Your email always stays private.</Text>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !result.ok }}
            disabled={!result.ok}
            onPress={save}
            style={({ pressed }) => [styles.primaryButton, (pressed || !result.ok) && styles.dimmed]}
          >
            <Text style={styles.primaryLabel}>Save</Text>
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
    minHeight: 60,
  },
  textButton: {
    width: 64,
  },
  cancel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  heading: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
  },
  form: {
    padding: 20,
    gap: 18,
  },
  note: {
    fontSize: 13,
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
  dimmed: {
    opacity: 0.5,
  },
});
