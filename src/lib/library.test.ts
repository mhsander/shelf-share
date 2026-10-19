import { filterByStatus, isFriendsOnly, libraryReducer, type LibraryState } from "@/lib/library";
import type { OwnedBook } from "@/types/book";

function book(overrides: Partial<OwnedBook>): OwnedBook {
  return {
    id: "1",
    title: "Piranesi",
    author: "Susanna Clarke",
    isbn: "9781635575637",
    coverUrl: null,
    personalRating: null,
    personalReview: null,
    status: "available",
    source: "scan",
    addedAt: "2026-10-16T12:00:00.000Z",
    lentTo: null,
    visibility: "everyone",
    ...overrides,
  };
}

const empty: LibraryState = { books: [] };

describe("libraryReducer", () => {
  it("adds a book at the top of the list", () => {
    const state = libraryReducer({ books: [book({ id: "old", isbn: null })] }, { type: "add", book: book({ id: "new" }) });
    expect(state.books.map((b) => b.id)).toEqual(["new", "old"]);
  });

  it("ignores a second copy with the same ISBN", () => {
    const once = libraryReducer(empty, { type: "add", book: book({ id: "a" }) });
    const twice = libraryReducer(once, { type: "add", book: book({ id: "b" }) });
    expect(twice).toBe(once);
  });

  it("allows several books without an ISBN", () => {
    let state = libraryReducer(empty, { type: "add", book: book({ id: "a", isbn: null }) });
    state = libraryReducer(state, { type: "add", book: book({ id: "b", isbn: null }) });
    expect(state.books).toHaveLength(2);
  });

  it("updates a book's details", () => {
    const state = libraryReducer({ books: [book({})] }, { type: "update", id: "1", changes: { personalRating: 4 } });
    expect(state.books[0].personalRating).toBe(4);
  });

  it("toggles between available and hidden", () => {
    let state = libraryReducer({ books: [book({})] }, { type: "setStatus", id: "1", status: "hidden" });
    expect(state.books[0].status).toBe("hidden");
    state = libraryReducer(state, { type: "setStatus", id: "1", status: "available" });
    expect(state.books[0].status).toBe("available");
  });

  it("does not change the status of a lent book by hand", () => {
    const start = { books: [book({ status: "lent", lentTo: { name: "Arturo", dueDate: "2026-11-06" } })] };
    expect(libraryReducer(start, { type: "setStatus", id: "1", status: "hidden" })).toBe(start);
  });

  it("removes a book that is not lent", () => {
    expect(libraryReducer({ books: [book({})] }, { type: "remove", id: "1" }).books).toEqual([]);
  });

  it("does not remove a lent book", () => {
    const start = { books: [book({ status: "lent", lentTo: { name: "Arturo", dueDate: "2026-11-06" } })] };
    expect(libraryReducer(start, { type: "remove", id: "1" })).toBe(start);
  });
});

describe("filterByStatus", () => {
  const books = [book({ id: "a" }), book({ id: "b", status: "hidden" }), book({ id: "c", status: "lent" })];

  it("returns everything for 'all'", () => {
    expect(filterByStatus(books, "all")).toHaveLength(3);
  });

  it("returns only the matching status", () => {
    expect(filterByStatus(books, "hidden").map((b) => b.id)).toEqual(["b"]);
  });
});

describe("isFriendsOnly", () => {
  it("follows the book's own setting", () => {
    expect(isFriendsOnly(book({ visibility: "friends" }), false)).toBe(true);
    expect(isFriendsOnly(book({ visibility: "everyone" }), false)).toBe(false);
  });

  it("treats every book as friends-only when the whole library is", () => {
    expect(isFriendsOnly(book({ visibility: "everyone" }), true)).toBe(true);
  });
});
