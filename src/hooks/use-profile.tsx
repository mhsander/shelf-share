import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from "react";

import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/query-client";
import { requireSupabase } from "@/lib/supabase";
import type {
  BlockedUser,
  Profile,
  ProfileFields,
} from "@/types/profile";

type ProfileContextValue = {
  profile: Profile | null;
  blocked: BlockedUser[];
  loading: boolean;
  error: Error | null;
  createProfile: (fields: ProfileFields) => Promise<void>;
  updateProfile: (changes: ProfileFields) => Promise<void>;
  unblock: (id: string) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

type State = { profile: Profile | null; blocked: BlockedUser[] };
type Action =
  | { type: "create"; profile: Profile }
  | { type: "update"; changes: ProfileFields }
  | { type: "unblock"; id: string };

function profileReducer(state: State, action: Action): State {
  switch (action.type) {
    case "create":
      return { ...state, profile: action.profile };
    case "update":
      return state.profile
        ? { ...state, profile: { ...state.profile, ...action.changes } }
        : state;
    case "unblock":
      return {
        ...state,
        blocked: state.blocked.filter((user) => user.id !== action.id),
      };
  }
}

function LocalProfileProvider({
  children,
  initialProfile,
  initialBlocked,
}: {
  children: ReactNode;
  initialProfile: Profile | null;
  initialBlocked: BlockedUser[];
}) {
  const [state, dispatch] = useReducer(profileReducer, {
    profile: initialProfile,
    blocked: initialBlocked,
  });
  const value: ProfileContextValue = {
    ...state,
    loading: false,
    error: null,
    async createProfile(fields) {
      dispatch({
        type: "create",
        profile: { ...fields, avatarUrl: null },
      });
    },
    async updateProfile(changes) {
      dispatch({ type: "update", changes });
    },
    async unblock(id) {
      dispatch({ type: "unblock", id });
    },
  };
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

function RemoteProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryKey = ["profile", userId];
  const query = useQuery({
    queryKey,
    enabled: Boolean(userId),
    queryFn: async () => {
      const client = requireSupabase();
      const [
        { data: row, error },
        { data: blockedNames, error: blockedNamesError },
      ] = await Promise.all([
        client
          .from("profiles")
          .select("id,display_name,city,neighborhood,avatar_path")
          .eq("id", userId!)
          .maybeSingle(),
        client.rpc("list_blocked_users"),
      ]);
      if (error) throw error;
      if (blockedNamesError) throw blockedNamesError;

      return {
        profile: row
          ? {
              displayName: row.display_name,
              city: row.city,
              neighborhood: row.neighborhood,
              avatarUrl: row.avatar_path,
            }
          : null,
        blocked: blockedNames.map(({ id, display_name }) => ({
          id,
          displayName: display_name,
        })),
      };
    },
  });
  const state = query.data ?? { profile: null, blocked: [] };
  const value: ProfileContextValue = {
    ...state,
    loading: query.isLoading,
    error: query.error,
    async createProfile(fields) {
      if (!userId) throw new Error("Sign in before creating a profile.");
      const client = requireSupabase();
      const { error } = await client.from("profiles").insert({
        id: userId,
        display_name: fields.displayName,
        city: fields.city,
        neighborhood: fields.neighborhood,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
    },
    async updateProfile(changes) {
      if (!userId) throw new Error("Sign in before updating a profile.");
      const client = requireSupabase();
      const { error } = await client
        .from("profiles")
        .update({
          display_name: changes.displayName,
          city: changes.city,
          neighborhood: changes.neighborhood,
        })
        .eq("id", userId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
    },
    async unblock(id) {
      if (!userId) throw new Error("Sign in before managing blocked users.");
      const client = requireSupabase();
      const { error } = await client
        .from("blocks")
        .delete()
        .eq("blocker_id", userId)
        .eq("blocked_id", id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
    },
  };
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function ProfileProvider({
  children,
  initialProfile,
  initialBlocked,
}: {
  children: ReactNode;
  initialProfile?: Profile | null;
  initialBlocked?: BlockedUser[];
}) {
  const hasInitialData = initialProfile !== undefined || initialBlocked !== undefined;
  return hasInitialData ? (
    <LocalProfileProvider
      initialProfile={initialProfile ?? null}
      initialBlocked={initialBlocked ?? []}
    >
      {children}
    </LocalProfileProvider>
  ) : (
    <RemoteProfileProvider>{children}</RemoteProfileProvider>
  );
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error("useProfile must be used inside ProfileProvider");
  return value;
}
