import type { CoverColor } from "@/constants/theme";

// Publication details from the ISBN lookup, saved when a book is scanned. Every field is optional
// because Open Library and Google Books records are often incomplete.
export type BookInfo = {
  description: string | null;
  publisher: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  subjects: string[];
};

// Mirrors the `book_visibility` enum in Postgres.
export type BookVisibility = "everyone" | "friends";

// A book another user has listed as available, as shown in search results.
export type ListedBook = {
  id: string;
  title: string;
  author: string;
  ownerId: string;
  ownerName: string;
  neighborhood: string;
  // How many of the owner's books are available to lend.
  ownerBookCount: number;
  coverColor: CoverColor;
  // Already resolved against the owner's library-wide setting.
  visibility: BookVisibility;
  // The owner's note, shown on the book detail screen.
  personalRating: number | null;
  personalReview: string | null;
  info: BookInfo | null;
};

// Mirrors the `book_status` and `book_source` enums in Postgres.
export type BookStatus = "available" | "lent" | "hidden";
export type BookSource = "manual" | "scan" | "goodreads_csv";

// A book in the signed-in user's own library (a `library_books` row).
export type OwnedBook = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  coverUrl: string | null;
  personalRating: number | null;
  personalReview: string | null;
  status: BookStatus;
  source: BookSource;
  addedAt: string;
  // From the book's `lent` borrow request; null unless status is `lent`.
  lentTo: { name: string; dueDate: string } | null;
  // Overridden to friends-only when the owner makes their whole library friends-only.
  visibility: BookVisibility;
  // Null for books typed in by hand or saved before the lookup returned.
  info: BookInfo | null;
};

// The fields a user can type or edit in the add/edit form.
export type BookDetails = Pick<OwnedBook, "title" | "author" | "isbn" | "coverUrl" | "personalRating" | "personalReview" | "visibility">;
