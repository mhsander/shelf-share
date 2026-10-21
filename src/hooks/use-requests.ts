import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/query-client";
import { requireSupabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type RequestStatus = Database["public"]["Enums"]["request_status"];

export type BorrowRequestSummary = {
  id: string;
  status: RequestStatus;
  createdAt: string;
  activityAt: string;
  dueDate: string | null;
  role: "borrower" | "lender";
  counterpartName: string;
  book: { id: string; title: string; author: string; coverUrl: string | null };
  latestMessage: string | null;
};

export type RequestMessage = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export type BorrowRequestDetails = BorrowRequestSummary & {
  borrowerId: string;
  lenderId: string;
  borrowerName: string;
  lenderName: string;
  messages: RequestMessage[];
};

const requestFields =
  "id,book_id,borrower_id,lender_id,status,due_date,created_at,updated_at,library_books!borrow_requests_book_id_fkey(id,title,author,cover_url)";

export function useBorrowRequests() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["activity", userId],
    enabled: Boolean(userId),
    refetchInterval: 15_000,
    queryFn: async (): Promise<BorrowRequestSummary[]> => {
      const client = requireSupabase();
      const { data: rows, error } = await client
        .from("borrow_requests")
        .select(requestFields)
        .or(`borrower_id.eq.${userId},lender_id.eq.${userId}`)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      if (!rows.length) return [];

      const peopleIds = [...new Set(rows.flatMap((row) => [row.borrower_id, row.lender_id]))];
      const requestIds = rows.map((row) => row.id);
      const [{ data: profiles, error: profileError }, { data: messages, error: messageError }] =
        await Promise.all([
          client.from("profiles").select("id,display_name").in("id", peopleIds),
          client.from("request_messages").select("request_id,body,created_at")
            .in("request_id", requestIds).order("created_at", { ascending: false }),
        ]);
      if (profileError) throw profileError;
      if (messageError) throw messageError;
      const names = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
      const latestMessage = new Map<string, { body: string; createdAt: string }>();
      for (const message of messages) {
        if (!latestMessage.has(message.request_id)) {
          latestMessage.set(message.request_id, { body: message.body, createdAt: message.created_at });
        }
      }

      return rows.flatMap((row) => {
        const book = row.library_books;
        if (!book) return [];
        const otherId = row.borrower_id === userId ? row.lender_id : row.borrower_id;
        const lastMessage = latestMessage.get(row.id);
        return [{
          id: row.id,
          status: row.status,
          createdAt: row.created_at,
          dueDate: row.due_date,
          role: row.borrower_id === userId ? "borrower" as const : "lender" as const,
          counterpartName: names.get(otherId) ?? "Neighbor",
          book: { id: book.id, title: book.title, author: book.author, coverUrl: book.cover_url },
          latestMessage: lastMessage?.body ?? null,
          activityAt: lastMessage && lastMessage.createdAt > row.updated_at
            ? lastMessage.createdAt
            : row.updated_at,
        }];
      }).sort((left, right) => right.activityAt.localeCompare(left.activityAt));
    },
  });
}

export function useBorrowRequest(id: string | undefined) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["borrow-request", id],
    enabled: Boolean(id && userId),
    refetchInterval: 10_000,
    queryFn: async (): Promise<BorrowRequestDetails | null> => {
      const client = requireSupabase();
      const { data: row, error } = await client
        .from("borrow_requests")
        .select(requestFields)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!row || !row.library_books) return null;

      const [{ data: profiles, error: profileError }, { data: messages, error: messagesError }] =
        await Promise.all([
          client.from("profiles").select("id,display_name")
            .in("id", [row.borrower_id, row.lender_id]),
          client.from("request_messages").select("id,sender_id,body,created_at")
            .eq("request_id", row.id).order("created_at", { ascending: true }),
        ]);
      if (profileError) throw profileError;
      if (messagesError) throw messagesError;
      const names = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
      const borrowerName = names.get(row.borrower_id) ?? "Neighbor";
      const lenderName = names.get(row.lender_id) ?? "Neighbor";
      const latestMessage = messages.at(-1);
      return {
        id: row.id,
        status: row.status,
        createdAt: row.created_at,
        dueDate: row.due_date,
        role: row.borrower_id === userId ? "borrower" : "lender",
        borrowerId: row.borrower_id,
        lenderId: row.lender_id,
        borrowerName,
        lenderName,
        counterpartName: row.borrower_id === userId ? lenderName : borrowerName,
        book: {
          id: row.library_books.id,
          title: row.library_books.title,
          author: row.library_books.author,
          coverUrl: row.library_books.cover_url,
        },
        latestMessage: latestMessage?.body ?? null,
        activityAt: latestMessage?.created_at && latestMessage.created_at > row.updated_at
          ? latestMessage.created_at
          : row.updated_at,
        messages: messages.map((message) => ({
          id: message.id,
          senderId: message.sender_id,
          senderName: names.get(message.sender_id) ?? "Neighbor",
          body: message.body,
          createdAt: message.created_at,
        })),
      };
    },
  });
}

export async function invalidateBorrowRequests(requestId?: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["activity"] }),
    ...(requestId
      ? [queryClient.invalidateQueries({ queryKey: ["borrow-request", requestId] })]
      : []),
    queryClient.invalidateQueries({ queryKey: ["library"] }),
    queryClient.invalidateQueries({ queryKey: ["search-books"] }),
  ]);
}
