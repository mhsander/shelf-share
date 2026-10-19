import type { ListedBook } from "@/types/book";

// Client-side stand-in until search moves to Postgres full-text search (spec §6.5).
export function filterBooks(books: ListedBook[], query: string): ListedBook[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return books;

  return books.filter(
    (book) => book.title.toLowerCase().includes(needle) || book.author.toLowerCase().includes(needle),
  );
}

// Client-side stand-in for the `library_books` RLS rule: friends-only books are visible to friends only.
export function visibleTo(books: ListedBook[], friendIds: Set<string>): ListedBook[] {
  return books.filter((book) => book.visibility === "everyone" || friendIds.has(book.ownerId));
}

export function fromFriends(books: ListedBook[], friendIds: Set<string>): ListedBook[] {
  return books.filter((book) => friendIds.has(book.ownerId));
}
