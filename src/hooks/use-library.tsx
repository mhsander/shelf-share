import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from "react";

import { useAuth } from "@/hooks/use-auth";
import { libraryReducer } from "@/lib/library";
import { queryClient } from "@/lib/query-client";
import { requireSupabase } from "@/lib/supabase";
import type {
  BookDetails,
  BookSource,
  BookStatus,
  OwnedBook,
} from "@/types/book";

type AddResult =
  | { ok: true; book: OwnedBook }
  | { ok: false; reason: "duplicate"; existing: OwnedBook };

type LibraryContextValue = {
  books: OwnedBook[];
  loading: boolean;
  error: Error | null;
  findByIsbn: (isbn: string) => OwnedBook | undefined;
  addBook: (details: BookDetails, source: BookSource) => Promise<AddResult>;
  updateBook: (id: string, changes: Partial<BookDetails>) => Promise<void>;
  setStatus: (id: string, status: Exclude<BookStatus, "lent">) => Promise<void>;
  removeBook: (id: string) => Promise<void>;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

function mapBook(
  row: {
    id: string;
    title: string;
    author: string;
    isbn: string | null;
    cover_url: string | null;
    personal_rating: number | null;
    personal_review: string | null;
    status: BookStatus;
    source: BookSource;
    added_at: string;
  },
  loan?: { name: string; dueDate: string } | null,
): OwnedBook {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    isbn: row.isbn,
    coverUrl: row.cover_url,
    personalRating: row.personal_rating,
    personalReview: row.personal_review,
    status: row.status,
    source: row.source,
    addedAt: row.added_at,
    lentTo: loan ?? null,
  };
}

function MockLibraryProvider({
  children,
  initialBooks,
}: {
  children: ReactNode;
  initialBooks: OwnedBook[];
}) {
  const [state, dispatch] = useReducer(libraryReducer, { books: initialBooks });
  const findByIsbn = (isbn: string) => state.books.find((book) => book.isbn === isbn);
  const value: LibraryContextValue = {
    books: state.books,
    loading: false,
    error: null,
    findByIsbn,
    async addBook(details, source) {
      const existing = details.isbn ? findByIsbn(details.isbn) : undefined;
      if (existing) return { ok: false, reason: "duplicate", existing };
      const book: OwnedBook = {
        ...details,
        id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        status: "available",
        source,
        addedAt: new Date().toISOString(),
        lentTo: null,
      };
      dispatch({ type: "add", book });
      return { ok: true, book };
    },
    async updateBook(id, changes) {
      dispatch({ type: "update", id, changes });
    },
    async setStatus(id, status) {
      dispatch({ type: "setStatus", id, status });
    },
    async removeBook(id) {
      dispatch({ type: "remove", id });
    },
  };
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

function RemoteLibraryProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryKey = ["library", userId];
  const query = useQuery({
    queryKey,
    enabled: Boolean(userId),
    queryFn: async () => {
      const client = requireSupabase();
      const { data: rows, error } = await client
        .from("library_books")
        .select("id,title,author,isbn,cover_url,personal_rating,personal_review,status,source,added_at")
        .eq("owner_id", userId!)
        .order("added_at", { ascending: false });
      if (error) throw error;

      const { data: loans, error: loanError } = await client
        .from("borrow_requests")
        .select("book_id,due_date,borrower_id")
        .eq("lender_id", userId!)
        .eq("status", "lent");
      if (loanError) throw loanError;

      const borrowerIds = [...new Set(loans.map((loan) => loan.borrower_id))];
      const { data: borrowers, error: borrowerError } = borrowerIds.length
        ? await client.from("profiles").select("id,display_name").in("id", borrowerIds)
        : { data: [], error: null };
      if (borrowerError) throw borrowerError;

      const borrowerNames = new Map(
        borrowers.map((borrower) => [borrower.id, borrower.display_name]),
      );
      const loanByBook = new Map(
        loans.map((loan) => [
          loan.book_id,
          {
            name: borrowerNames.get(loan.borrower_id) ?? "Neighbor",
            dueDate: loan.due_date ?? "",
          },
        ]),
      );
      return rows.map((row) => mapBook(row, loanByBook.get(row.id)));
    },
  });
  const books = query.data ?? [];

  const value: LibraryContextValue = {
    books,
    loading: query.isLoading,
    error: query.error,
    findByIsbn: (isbn) => books.find((book) => book.isbn === isbn),
    async addBook(details, source) {
      const existing = details.isbn
        ? books.find((book) => book.isbn === details.isbn)
        : undefined;
      if (existing) return { ok: false, reason: "duplicate", existing };
      const client = requireSupabase();
      const { data, error } = await client
        .from("library_books")
        .insert({
          owner_id: userId!,
          title: details.title,
          author: details.author,
          isbn: details.isbn,
          cover_url: details.coverUrl,
          personal_rating: details.personalRating,
          personal_review: details.personalReview,
          source,
        })
        .select("id,title,author,isbn,cover_url,personal_rating,personal_review,status,source,added_at")
        .single();
      if (error) {
        if (error.code === "23505") {
          await queryClient.invalidateQueries({ queryKey });
          const duplicate = queryClient
            .getQueryData<OwnedBook[]>(queryKey)
            ?.find((book) => book.isbn === details.isbn);
          if (duplicate) return { ok: false, reason: "duplicate", existing: duplicate };
        }
        throw error;
      }
      const book = mapBook(data);
      await queryClient.invalidateQueries({ queryKey });
      return { ok: true, book };
    },
    async updateBook(id, changes) {
      const { error } = await requireSupabase()
        .from("library_books")
        .update({
          title: changes.title,
          author: changes.author,
          isbn: changes.isbn,
          cover_url: changes.coverUrl,
          personal_rating: changes.personalRating,
          personal_review: changes.personalReview,
        })
        .eq("id", id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
    },
    async setStatus(id, status) {
      const { error } = await requireSupabase()
        .from("library_books")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
    },
    async removeBook(id) {
      const { error } = await requireSupabase()
        .from("library_books")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey });
    },
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function LibraryProvider({
  children,
  initialBooks,
}: {
  children: ReactNode;
  initialBooks?: OwnedBook[];
}) {
  return initialBooks
    ? <MockLibraryProvider initialBooks={initialBooks}>{children}</MockLibraryProvider>
    : <RemoteLibraryProvider>{children}</RemoteLibraryProvider>;
}

export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("useLibrary must be used inside LibraryProvider");
  return value;
}
