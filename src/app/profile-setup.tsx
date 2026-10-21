import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FormField } from "@/components/form-field";
import { colors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { validateProfile } from "@/lib/profile";
import type { ProfileDraft } from "@/types/profile";

type Field = keyof ProfileDraft;

export default function ProfileSetupScreen() {
  const { session, signOut } = useAuth();
  const { createProfile } = useProfile();
  const [draft, setDraft] = useState<ProfileDraft>({
    displayName: "",
    city: "",
    neighborhood: "",
  });
  const [touched, setTouched] = useState<Set<Field>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const result = validateProfile(draft);
  const errors = result.ok ? {} : result.errors;

  function change(field: Field) {
    return (text: string) => {
      setDraft((value) => ({ ...value, [field]: text }));
      setTouched((value) => new Set(value).add(field));
    };
  }

  async function save() {
    if (!result.ok || !session) return;
    setSaving(true);
    setError(null);
    try {
      await createProfile(result.profile);
      router.replace("/(tabs)");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Set up your profile</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void signOut().catch((error) =>
            Alert.alert(
              "Couldn't sign out",
              error instanceof Error ? error.message : "Please try again.",
            ),
          )}
        >
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Let neighbors know who they&apos;re borrowing from. Your email stays private.
          </Text>
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
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        </ScrollView>
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !result.ok || saving }}
            disabled={!result.ok || saving}
            onPress={() => void save()}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || !result.ok || saving) && styles.dimmed,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.primaryLabel}>Continue</Text>
            )}
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  heading: {
    fontSize: 23,
    fontWeight: "900",
    color: colors.ink,
  },
  signOut: {
    color: colors.primary,
    fontWeight: "700",
  },
  form: {
    padding: 20,
    gap: 18,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkMuted,
  },
  error: {
    color: colors.danger,
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
