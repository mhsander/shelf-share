import type { Session } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import Constants from "expo-constants";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";

import { queryClient } from "@/lib/query-client";
import { unregisterPushToken } from "@/lib/push-notifications";
import { isSupabaseConfigured, requireSupabase } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const activeUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const client = requireSupabase();
    let active = true;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setError(null);
      const nextUserId = nextSession?.user.id ?? null;
      if (activeUserId.current !== nextUserId) queryClient.clear();
      activeUserId.current = nextUserId;
    });

    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError(sessionError.message);
      } else {
        setSession(data.session);
        activeUserId.current = data.session?.user.id ?? null;
      }
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      error,
      configured: isSupabaseConfigured,
      async signInWithGoogle() {
        const client = requireSupabase();
        if (Platform.OS === "web") {
          const { error: oauthError } = await client.auth.signInWithOAuth({
            provider: "google",
          });
          if (oauthError) throw oauthError;
          return;
        }
        if (
          !googleWebClientId ||
          (Platform.OS === "ios" &&
            (!googleIosClientId || !process.env.GOOGLE_IOS_URL_SCHEME))
        ) {
          throw new Error(
            "Configure the Google web and iOS client IDs and iOS URL scheme before enabling Google sign-in.",
          );
        }
        if (Constants.expoGoConfig) {
          throw new Error(
            "Google Sign-In requires a development build. Expo Go does not include its native module.",
          );
        }
        const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
        GoogleSignin.configure({
          webClientId: googleWebClientId,
          iosClientId: googleIosClientId,
        });
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const response = await GoogleSignin.signIn();
        if (response.type === "cancelled") return;
        if (!response.data.idToken) {
          throw new Error("Google sign-in did not return an ID token.");
        }
        const { error: signInError } = await client.auth.signInWithIdToken({
          provider: "google",
          token: response.data.idToken,
        });
        if (signInError) throw signInError;
      },
      async signInWithApple() {
        if (Platform.OS !== "ios") {
          throw new Error("Apple sign-in is only available on iOS.");
        }
        const client = requireSupabase();
        const nonce = Crypto.randomUUID();
        const hashedNonce = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          nonce,
        );
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          ],
          nonce: hashedNonce,
        });
        if (!credential.identityToken) {
          throw new Error("Apple sign-in did not return an identity token.");
        }
        const { error: signInError } = await client.auth.signInWithIdToken({
          provider: "apple",
          token: credential.identityToken,
          nonce,
        });
        if (signInError) throw signInError;
      },
      async signOut() {
        try {
          await unregisterPushToken();
        } catch (pushTokenError) {
          console.warn("Could not unregister the push token before signing out.", pushTokenError);
        }
        const { error: signOutError } = await requireSupabase().auth.signOut();
        if (signOutError) throw signOutError;
      },
      async deleteAccount() {
        const client = requireSupabase();
        const { error: deletionError } = await client.functions.invoke("delete-account", {
          method: "POST",
        });
        if (deletionError) throw deletionError;
        const { error: signOutError } = await client.auth.signOut({ scope: "local" });
        if (signOutError) throw signOutError;
      },
    }),
    [session, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export function isGoogleSignInCancellation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "SIGN_IN_CANCELLED"
  );
}
