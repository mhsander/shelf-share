import Ionicons from "@expo/vector-icons/Ionicons";
import * as AppleAuthentication from "expo-apple-authentication";
import { openBrowserAsync } from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";
import { isGoogleSignInCancellation, useAuth } from "@/hooks/use-auth";
import { links } from "@/constants/links";

export default function SignInScreen() {
  const { configured, error: authError, signInWithGoogle, signInWithApple } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  async function runSignIn(action: () => Promise<void>) {
    setWorking(true);
    setError(null);
    try {
      await action();
    } catch (signInError) {
      if (!isGoogleSignInCancellation(signInError) && !isAppleCancellation(signInError)) {
        setError(
          signInError instanceof Error
            ? signInError.message
            : "Sign-in failed. Please try again.",
        );
      }
    } finally {
      setWorking(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <View style={styles.mark}>
            <Ionicons name="book" size={30} color={colors.onPrimary} />
          </View>
          <Text style={styles.title}>Shelf Share</Text>
          <Text style={styles.subtitle}>
            Borrow good books from people in your community.
          </Text>
        </View>

        <View style={styles.actions}>
          {!configured && (
            <Text style={styles.error}>
              Connect your Supabase project by copying .env.example to .env and
              setting the project URL and publishable key.
            </Text>
          )}
          {(error ?? authError) && (
            <Text accessibilityRole="alert" style={styles.error}>{error ?? authError}</Text>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={!configured || working}
            onPress={() => void runSignIn(signInWithGoogle)}
            style={({ pressed }) => [
              styles.googleButton,
              (pressed || working || !configured) && styles.dimmed,
            ]}
          >
            {working ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={colors.ink} />
                <Text style={styles.googleLabel}>Continue with Google</Text>
              </>
            )}
          </Pressable>
          {Platform.OS === "ios" && appleAvailable && configured && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={styles.appleButton}
              onPress={() => {
                if (!working) void runSignIn(signInWithApple);
              }}
            />
          )}
          <Text style={styles.privacy}>
            Your email is never shown to other members.
          </Text>
        </View>

        <View style={styles.legal}>
          <Pressable onPress={() => void openLegalPage(links.privacy)}>
            <Text style={styles.legalLink}>Privacy policy</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => void openLegalPage(links.terms)}>
            <Text style={styles.legalLink}>Terms</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

async function openLegalPage(url: string) {
  try {
    await openBrowserAsync(url);
  } catch {
    Alert.alert("Couldn't open the page.");
  }
}

function isAppleCancellation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ERR_REQUEST_CANCELED"
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brand: {
    alignItems: "center",
    marginTop: 80,
    gap: 14,
  },
  mark: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: colors.ink,
  },
  subtitle: {
    maxWidth: 280,
    fontSize: 16,
    lineHeight: 23,
    color: colors.inkMuted,
    textAlign: "center",
  },
  actions: {
    gap: 14,
    marginVertical: 40,
  },
  googleButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  googleLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  appleButton: {
    width: "100%",
    height: 54,
  },
  dimmed: {
    opacity: 0.55,
  },
  privacy: {
    fontSize: 13,
    textAlign: "center",
    color: colors.inkMuted,
  },
  error: {
    color: colors.danger,
    lineHeight: 20,
    textAlign: "center",
  },
  legal: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  legalLink: {
    color: colors.inkMuted,
    fontSize: 13,
    textDecorationLine: "underline",
  },
  legalDot: {
    color: colors.inkMuted,
  },
});
