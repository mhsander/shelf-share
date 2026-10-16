import type { BookDetails, BookStatus, OwnedBook } from "@/types/book";

// Local state for "My library" until it is backed by `library_books` in Supabase.
// The rules mirror the database: one copy per ISBN, and lent books can't be hidden or deleted
// (status changes for loans go through the borrow-request flow, spec §7).

export type LibraryState = { books: OwnedBook[] };

export type LibraryAction =
  | { type: "add"; book: OwnedBook }
  | { type: "update"; id: string; changes: Partial<BookDetails> }
  | { type: "setStatus"; id: string; status: Exclude<BookStatus, "lent"> }
  | { type: "remove"; id: string };

export function libraryReducer(state: LibraryState, action: LibraryAction): LibraryState {
  switch (action.type) {
    case "add": {
      const { isbn } = action.book;
      if (isbn && state.books.some((b) => b.isbn === isbn)) return state;
      return { books: [action.book, ...state.books] };
    }
    case "update":
      return { books: state.books.map((b) => (b.id === action.id ? { ...b, ...action.changes } : b)) };
    case "setStatus": {
      const target = state.books.find((b) => b.id === action.id);
      if (!target || target.status === "lent") return state;
      return { books: state.books.map((b) => (b.id === action.id ? { ...b, status: action.status } : b)) };
    }
    case "remove": {
      const target = state.books.find((b) => b.id === action.id);
      if (!target || target.status === "lent") return state;
      return { books: state.books.filter((b) => b.id !== action.id) };
    }
  }
}

export type StatusFilter = "all" | BookStatus;

export function filterByStatus(books: OwnedBook[], filter: StatusFilter): OwnedBook[] {
  return filter === "all" ? books : books.filter((b) => b.status === filter);
}
