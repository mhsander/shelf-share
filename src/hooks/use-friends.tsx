import { createContext, useContext, useReducer, type ReactNode } from "react";

import { sampleFriends } from "@/data/sample-people";
import { friendsReducer, relationshipWith, type FriendsState } from "@/lib/friends";
import type { Person, Relationship } from "@/types/friends";

// The signed-in user's friends and friend requests, held in memory for now.
// TODO: back this with `friendships` and the friend RPCs (spec §7.1) once auth is in place.

type FriendsContextValue = FriendsState & {
  friendIds: Set<string>;
  relationshipWith: (id: string) => Relationship;
  sendRequest: (person: Person) => void;
  accept: (id: string) => void;
  decline: (id: string) => void;
  cancelRequest: (id: string) => void;
  removeFriend: (id: string) => void;
};

const FriendsContext = createContext<FriendsContextValue | null>(null);

export function FriendsProvider({ children, initialState = sampleFriends }: { children: ReactNode; initialState?: FriendsState }) {
  const [state, dispatch] = useReducer(friendsReducer, initialState);

  const value: FriendsContextValue = {
    ...state,
    friendIds: new Set(state.friends.map((p) => p.id)),
    relationshipWith: (id) => relationshipWith(state, id),
    sendRequest: (person) => dispatch({ type: "send", person }),
    accept: (id) => dispatch({ type: "accept", id }),
    decline: (id) => dispatch({ type: "decline", id }),
    cancelRequest: (id) => dispatch({ type: "cancel", id }),
    removeFriend: (id) => dispatch({ type: "remove", id }),
  };

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends() {
  const value = useContext(FriendsContext);
  if (!value) throw new Error("useFriends must be used inside FriendsProvider");
  return value;
}
