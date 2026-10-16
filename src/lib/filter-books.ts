import type { ListedBook } from "@/types/book";

// Client-side stand-in until search moves to Postgres full-text search (spec §6.5).
export function filterBooks(books: ListedBook[], query: string): ListedBook[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return books;

  return books.filter(
    (book) => book.title.toLowerCase().includes(needle) || book.author.toLowerCase().includes(needle),
  );
}
