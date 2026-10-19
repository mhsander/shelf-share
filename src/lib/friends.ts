import type { Person, Relationship } from "@/types/friends";

// Local state for friendships until it is backed by `friendships` in Supabase.
// The rules mirror the friend RPCs (spec §7.1): friendships are mutual and need the other
// person's acceptance, and asking someone who already asked you makes you friends.

export type FriendsState = { friends: Person[]; incoming: Person[]; outgoing: Person[] };

export type FriendsAction =
  | { type: "send"; person: Person }
  | { type: "accept"; id: string }
  | { type: "decline"; id: string }
  | { type: "cancel"; id: string }
  | { type: "remove"; id: string };

export function relationshipWith(state: FriendsState, id: string): Relationship {
  if (state.friends.some((p) => p.id === id)) return "friends";
  if (state.incoming.some((p) => p.id === id)) return "requestReceived";
  if (state.outgoing.some((p) => p.id === id)) return "requestSent";
  return "none";
}

const without = (people: Person[], id: string) => people.filter((p) => p.id !== id);

export function friendsReducer(state: FriendsState, action: FriendsAction): FriendsState {
  switch (action.type) {
    case "send": {
      const relationship = relationshipWith(state, action.person.id);
      if (relationship === "requestReceived") return friendsReducer(state, { type: "accept", id: action.person.id });
      if (relationship !== "none") return state;
      return { ...state, outgoing: [...state.outgoing, action.person] };
    }
    case "accept": {
      const person = state.incoming.find((p) => p.id === action.id);
      if (!person) return state;
      return { ...state, friends: [...state.friends, person], incoming: without(state.incoming, action.id) };
    }
    case "decline":
      return { ...state, incoming: without(state.incoming, action.id) };
    case "cancel":
      return { ...state, outgoing: without(state.outgoing, action.id) };
    case "remove":
      return { ...state, friends: without(state.friends, action.id) };
  }
}
