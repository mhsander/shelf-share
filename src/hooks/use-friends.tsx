import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useReducer, type ReactNode } from "react";
import { Alert } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { friendsReducer, relationshipWith, type FriendsState } from "@/lib/friends";
import { queryClient } from "@/lib/query-client";
import { requireSupabase } from "@/lib/supabase";
import type { Person, Relationship } from "@/types/friends";

type FriendsContextValue = FriendsState & {
  friendIds: Set<string>;
  relationshipWith: (id: string) => Relationship;
  requests: { id: string; senderId: string; recipientId: string; direction: "incoming" | "outgoing" }[];
  loading: boolean;
  sendRequest: (person: Person) => Promise<void>;
  accept: (id: string) => Promise<void>;
  decline: (id: string) => Promise<void>;
  cancelRequest: (id: string) => Promise<void>;
  removeFriend: (id: string) => Promise<void>;
};

const FriendsContext = createContext<FriendsContextValue | null>(null);

function LocalFriendsProvider({ children, initialState }: { children: ReactNode; initialState: FriendsState }) {
  const [state, dispatch] = useReducer(friendsReducer, initialState);

  const value: FriendsContextValue = {
    ...state,
    friendIds: new Set(state.friends.map((p) => p.id)),
    requests: [],
    loading: false,
    relationshipWith: (id) => relationshipWith(state, id),
    sendRequest: async (person) => { dispatch({ type: "send", person }); },
    accept: async (id) => { dispatch({ type: "accept", id }); },
    decline: async (id) => { dispatch({ type: "decline", id }); },
    cancelRequest: async (id) => { dispatch({ type: "cancel", id }); },
    removeFriend: async (id) => { dispatch({ type: "remove", id }); },
  };

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

function RemoteFriendsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryKey = ["friends", userId];
  const query = useQuery({
    queryKey,
    enabled: Boolean(userId),
    queryFn: async () => {
      const client = requireSupabase();
      const [{ data: friendships, error: friendsError }, { data: requests, error: requestsError }] =
        await Promise.all([
          client.from("friendships").select("user_low,user_high").or(`user_low.eq.${userId},user_high.eq.${userId}`),
          client.from("friend_requests").select("id,sender_id,recipient_id").eq("status", "pending")
            .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
        ]);
      if (friendsError) throw friendsError;
      if (requestsError) throw requestsError;

      const friendIds = friendships.map((row) => row.user_low === userId ? row.user_high : row.user_low);
      const personIds = [...new Set([
        ...friendIds,
        ...requests.flatMap((request) => [request.sender_id, request.recipient_id]),
      ])];
      const { data: profiles, error: profileError } = personIds.length
        ? await client.from("profiles").select("id,display_name,city,neighborhood,avatar_path").in("id", personIds)
        : { data: [], error: null };
      if (profileError) throw profileError;
      const people = new Map(profiles.map((row) => [row.id, {
        id: row.id,
        displayName: row.display_name,
        city: row.city,
        neighborhood: row.neighborhood,
        avatarUrl: row.avatar_path,
      } satisfies Person]));
      return {
        friends: friendIds.flatMap((id) => people.get(id) ? [people.get(id)!] : []),
        requests: requests.flatMap((request) =>
          people.has(request.sender_id) && people.has(request.recipient_id)
            ? [{
                id: request.id,
                senderId: request.sender_id,
                recipientId: request.recipient_id,
                direction: request.recipient_id === userId ? "incoming" as const : "outgoing" as const,
              }]
            : []),
        people,
      };
    },
  });
  const friends = query.data?.friends ?? [];
  const requests = query.data?.requests ?? [];
  const people = query.data?.people;
  const incoming = requests.flatMap((request) => request.direction === "incoming" && people?.get(request.senderId)
    ? [people.get(request.senderId)!]
    : []);
  const outgoing = requests.flatMap((request) => request.direction === "outgoing" && people?.get(request.recipientId)
    ? [people.get(request.recipientId)!]
    : []);
  const state: FriendsState = { friends, incoming, outgoing };
  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const requestForPerson = (id: string, direction: "incoming" | "outgoing") =>
    requests.find((request) => request.direction === direction &&
      (direction === "incoming" ? request.senderId : request.recipientId) === id);
  const call = async (action: () => Promise<void>) => {
    try {
      await action();
      await refresh();
    } catch (error) {
      Alert.alert("Couldn't update friends", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const value: FriendsContextValue = {
    ...state,
    friendIds: new Set(friends.map((person) => person.id)),
    requests,
    loading: query.isLoading,
    relationshipWith: (id) => relationshipWith(state, id),
    sendRequest: (person) => call(async () => {
      const { error } = await requireSupabase().rpc("send_friend_request", { p_recipient_id: person.id });
      if (error) throw error;
    }),
    accept: (id) => call(async () => {
      const request = requestForPerson(id, "incoming");
      if (!request) throw new Error("That friend request is no longer available.");
      const { error } = await requireSupabase().rpc("respond_to_friend_request", {
        p_request_id: request.id,
        p_response: "accepted",
      });
      if (error) throw error;
    }),
    decline: (id) => call(async () => {
      const request = requestForPerson(id, "incoming");
      if (!request) throw new Error("That friend request is no longer available.");
      const { error } = await requireSupabase().rpc("respond_to_friend_request", {
        p_request_id: request.id,
        p_response: "declined",
      });
      if (error) throw error;
    }),
    cancelRequest: (id) => call(async () => {
      const request = requestForPerson(id, "outgoing");
      if (!request) throw new Error("That friend request is no longer available.");
      const { error } = await requireSupabase().rpc("cancel_friend_request", { p_request_id: request.id });
      if (error) throw error;
    }),
    removeFriend: (id) => call(async () => {
      const { error } = await requireSupabase().rpc("remove_friend", { p_friend_id: id });
      if (error) throw error;
    }),
  };
  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function FriendsProvider({ children, initialState }: { children: ReactNode; initialState?: FriendsState }) {
  return initialState
    ? <LocalFriendsProvider initialState={initialState}>{children}</LocalFriendsProvider>
    : <RemoteFriendsProvider>{children}</RemoteFriendsProvider>;
}

export function useFriends() {
  const value = useContext(FriendsContext);
  if (!value) throw new Error("useFriends must be used inside FriendsProvider");
  return value;
}
