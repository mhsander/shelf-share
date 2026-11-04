import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

import type { Database } from "@/types/database";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

const authStorage =
  Platform.OS === "web"
    ? {
        async getItem(key: string) {
          return typeof window === "undefined" ? null : window.localStorage.getItem(key);
        },
        async setItem(key: string, value: string) {
          if (typeof window !== "undefined") window.localStorage.setItem(key, value);
        },
        async removeItem(key: string) {
          if (typeof window !== "undefined") window.localStorage.removeItem(key);
        },
      }
    : AsyncStorage;

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseKey!, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your local environment.",
    );
  }
  return supabase;
}
