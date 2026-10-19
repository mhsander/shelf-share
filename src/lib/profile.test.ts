import { initials, libraryCounts, validateProfile } from "@/lib/profile";
import type { BookStatus, OwnedBook } from "@/types/book";

function book(id: string, status: BookStatus): OwnedBook {
  return {
    id,
    title: `Book ${id}`,
    author: "Author",
    isbn: null,
    coverUrl: null,
    personalRating: null,
    personalReview: null,
    status,
    source: "manual",
    addedAt: "2026-10-01T12:00:00.000Z",
    lentTo: status === "lent" ? { name: "Arturo", dueDate: "2026-11-06" } : null,
    visibility: "everyone",
  };
}

describe("validateProfile", () => {
  it("trims and accepts a valid draft", () => {
    expect(validateProfile({ displayName: "  Ana ", city: " Seattle ", neighborhood: " Capitol Hill " })).toEqual({
      ok: true,
      profile: { displayName: "Ana", city: "Seattle", neighborhood: "Capitol Hill" },
    });
  });

  it("stores an empty neighborhood as null", () => {
    expect(validateProfile({ displayName: "Ana", city: "Seattle", neighborhood: "   " })).toEqual({
      ok: true,
      profile: { displayName: "Ana", city: "Seattle", neighborhood: null },
    });
  });

  it("rejects a blank name and city", () => {
    expect(validateProfile({ displayName: "   ", city: "", neighborhood: "" })).toEqual({
      ok: false,
      errors: { displayName: "Add your name.", city: "Add your city." },
    });
  });

  it("allows 60 characters and rejects 61", () => {
    expect(validateProfile({ displayName: ` ${"a".repeat(60)} `, city: "X", neighborhood: "" }).ok).toBe(true);
    expect(validateProfile({ displayName: "a".repeat(61), city: "X", neighborhood: "" })).toEqual({
      ok: false,
      errors: { displayName: "Use 60 characters or fewer." },
    });
  });
});

describe("initials", () => {
  it.each([
    ["Ana", "A"],
    ["ana maría ruiz", "AR"],
    ["  Ana   María  Ruiz ", "AR"],
    ["", "?"],
  ])("%j gives %j", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

describe("libraryCounts", () => {
  it("counts total, available, and lent books", () => {
    const books = [book("1", "available"), book("2", "available"), book("3", "lent"), book("4", "hidden")];
    expect(libraryCounts(books)).toEqual({ total: 4, available: 2, lent: 1 });
  });
});
