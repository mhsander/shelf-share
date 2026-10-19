import { createContext, useContext, useReducer, type ReactNode } from "react";

import { sampleBlocked, sampleProfile } from "@/data/sample-profile";
import type { BlockedUser, Profile, ProfileFields } from "@/types/profile";

// The signed-in user's profile and block list, held in memory for now.
// TODO: back this with `profiles` and `blocks` via TanStack Query once auth is in place.

type State = { profile: Profile; blocked: BlockedUser[] };
type Action = { type: "update"; changes: ProfileFields } | { type: "unblock"; id: string };

function profileReducer(state: State, action: Action): State {
  switch (action.type) {
    case "update":
      return { ...state, profile: { ...state.profile, ...action.changes } };
    case "unblock":
      return { ...state, blocked: state.blocked.filter((u) => u.id !== action.id) };
  }
}

type ProfileContextValue = State & {
  updateProfile: (changes: ProfileFields) => void;
  unblock: (id: string) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

type ProviderProps = {
  children: ReactNode;
  initialProfile?: Profile;
  initialBlocked?: BlockedUser[];
};

export function ProfileProvider({ children, initialProfile = sampleProfile, initialBlocked = sampleBlocked }: ProviderProps) {
  const [state, dispatch] = useReducer(profileReducer, { profile: initialProfile, blocked: initialBlocked });

  const value: ProfileContextValue = {
    ...state,
    updateProfile: (changes) => dispatch({ type: "update", changes }),
    unblock: (id) => dispatch({ type: "unblock", id }),
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error("useProfile must be used inside ProfileProvider");
  return value;
}
