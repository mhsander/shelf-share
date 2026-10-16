import { filterBooks } from "@/lib/filter-books";
import type { ListedBook } from "@/types/book";

const books: ListedBook[] = [
  { id: "1", title: "The Overstory", author: "Richard Powers", ownerName: "Ana", neighborhood: "Ballard", coverColor: "green" },
  { id: "2", title: "Piranesi", author: "Susanna Clarke", ownerName: "Ben", neighborhood: "Fremont", coverColor: "blue" },
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
