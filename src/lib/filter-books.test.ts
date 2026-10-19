import { filterBooks, fromFriends, visibleTo } from "@/lib/filter-books";
import type { ListedBook } from "@/types/book";

const note = { ownerBookCount: 1, personalRating: null, personalReview: null };
const books: ListedBook[] = [
  { id: "1", title: "The Overstory", author: "Richard Powers", ownerId: "ana", ownerName: "Ana", neighborhood: "Ballard", coverColor: "green", visibility: "everyone", ...note },
  { id: "2", title: "Piranesi", author: "Susanna Clarke", ownerId: "arturo", ownerName: "Arturo", neighborhood: "Fremont", coverColor: "blue", visibility: "friends", ...note },
];

describe("filterBooks", () => {
  it("returns every book for an empty query", () => {
    expect(filterBooks(books, "  ")).toEqual(books);
  });

  it("matches title case-insensitively", () => {
    expect(filterBooks(books, "overSTORY").map((b) => b.id)).toEqual(["1"]);
  });

  it("matches author", () => {
    expect(filterBooks(books, "clarke").map((b) => b.id)).toEqual(["2"]);
  });

  it("returns nothing when no book matches", () => {
    expect(filterBooks(books, "dune")).toEqual([]);
  });
});

describe("visibleTo", () => {
  it("hides friends-only books from people who aren't friends", () => {
    expect(visibleTo(books, new Set()).map((b) => b.id)).toEqual(["1"]);
  });

  it("shows friends-only books to friends", () => {
    expect(visibleTo(books, new Set(["arturo"])).map((b) => b.id)).toEqual(["1", "2"]);
  });
});

describe("fromFriends", () => {
  it("keeps only books owned by friends", () => {
    expect(fromFriends(books, new Set(["ana"])).map((b) => b.id)).toEqual(["1"]);
  });
});
