import { createContext, useContext, useReducer, type ReactNode } from "react";

import { sampleLibrary } from "@/data/sample-library";
import { libraryReducer } from "@/lib/library";
import type { BookDetails, BookSource, BookStatus, OwnedBook } from "@/types/book";

// The signed-in user's library, held in memory for now.
// TODO: back this with `library_books` via TanStack Query once auth is in place.

type AddResult = { ok: true; book: OwnedBook } | { ok: false; reason: "duplicate"; existing: OwnedBook };

type LibraryContextValue = {
  books: OwnedBook[];
  findByIsbn: (isbn: string) => OwnedBook | undefined;
  addBook: (details: BookDetails, source: BookSource) => AddResult;
  updateBook: (id: string, changes: Partial<BookDetails>) => void;
  setStatus: (id: string, status: Exclude<BookStatus, "lent">) => void;
  removeBook: (id: string) => void;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

// Temporary client-side id; Postgres assigns real ids.
function newId() {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function LibraryProvider({ children, initialBooks = sampleLibrary }: { children: ReactNode; initialBooks?: OwnedBook[] }) {
  const [state, dispatch] = useReducer(libraryReducer, { books: initialBooks });

  const findByIsbn = (isbn: string) => state.books.find((b) => b.isbn === isbn);

  const value: LibraryContextValue = {
    books: state.books,
    findByIsbn,
    addBook: (details, source) => {
      const existing = details.isbn ? findByIsbn(details.isbn) : undefined;
      if (existing) return { ok: false, reason: "duplicate", existing };
      const book: OwnedBook = {
        ...details,
        id: newId(),
        status: "available",
        source,
        addedAt: new Date().toISOString(),
        lentTo: null,
      };
      dispatch({ type: "add", book });
      return { ok: true, book };
    },
    updateBook: (id, changes) => dispatch({ type: "update", id, changes }),
    setStatus: (id, status) => dispatch({ type: "setStatus", id, status }),
    removeBook: (id) => dispatch({ type: "remove", id }),
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("useLibrary must be used inside LibraryProvider");
  return value;
}
