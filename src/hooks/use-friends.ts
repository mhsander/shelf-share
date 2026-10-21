import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/query-client";
import { requireSupabase } from "@/lib/supabase";

export type Friend = { id: string; displayName: string };
export type FriendRequest = {
  id: string;
  senderId: string;
  recipientId: string;
  direction: "incoming" | "outgoing";
};

export function useFriends() {
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
          client
            .from("friendships")
            .select("user_low,user_high")
            .or(`user_low.eq.${userId},user_high.eq.${userId}`),
          client
            .from("friend_requests")
            .select("id,sender_id,recipient_id")
            .eq("status", "pending")
            .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
        ]);
      if (friendsError) throw friendsError;
      if (requestsError) throw requestsError;

      const friendIds = friendships.map((friendship) =>
        friendship.user_low === userId ? friendship.user_high : friendship.user_low,
      );
      const personIds = [
        ...new Set([
          ...friendIds,
          ...requests.flatMap((request) => [request.sender_id, request.recipient_id]),
        ]),
      ];
      const { data: people, error: peopleError } = personIds.length
        ? await client.from("profiles").select("id,display_name").in("id", personIds)
        : { data: [], error: null };
      if (peopleError) throw peopleError;
      const names = new Map(people.map((person) => [person.id, person.display_name]));
      return {
        friends: friendIds.flatMap((id) => {
          const displayName = names.get(id);
          return displayName ? [{ id, displayName }] : [];
        }),
        requests: requests.flatMap((request) => {
          if (!names.has(request.sender_id) || !names.has(request.recipient_id)) return [];
          return [{
            id: request.id,
            senderId: request.sender_id,
            recipientId: request.recipient_id,
            direction: request.recipient_id === userId ? "incoming" as const : "outgoing" as const,
          }];
        }),
      };
    },
  });

  return {
    friends: query.data?.friends ?? [],
    requests: query.data?.requests ?? [],
    loading: query.isLoading,
    error: query.error,
    async sendFriendRequest(recipientId: string) {
      const { error } = await requireSupabase().rpc("send_friend_request", {
        p_recipient_id: recipientId,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
    },
    async respondToFriendRequest(requestId: string, response: "accepted" | "declined") {
      const { error } = await requireSupabase().rpc("respond_to_friend_request", {
        p_request_id: requestId,
        p_response: response,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
    },
    async cancelFriendRequest(requestId: string) {
      const { error } = await requireSupabase().rpc("cancel_friend_request", {
        p_request_id: requestId,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
    },
  };
}
