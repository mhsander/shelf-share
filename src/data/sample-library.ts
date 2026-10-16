import type { OwnedBook } from "@/types/book";

// Placeholder data until "My library" reads `library_books` from Supabase.
export const sampleLibrary: OwnedBook[] = [
  {
    id: "sample-1",
    title: "Piranesi",
    author: "Susanna Clarke",
    isbn: "9781635575637",
    coverUrl: null,
    personalRating: 5,
    personalReview: null,
    status: "lent",
    source: "scan",
    addedAt: "2026-09-02T18:00:00.000Z",
    lentTo: { name: "Ben", dueDate: "2026-11-06" },
  },
  {
    id: "sample-2",
    title: "The Overstory",
    author: "Richard Powers",
    isbn: null,
    coverUrl: null,
    personalRating: 4,
    personalReview: null,
    status: "available",
    source: "manual",
    addedAt: "2026-09-01T18:00:00.000Z",
    lentTo: null,
  },
  {
    id: "sample-3",
    title: "Station Eleven",
    author: "Emily St. John Mandel",
    isbn: null,
    coverUrl: null,
    personalRating: null,
    personalReview: null,
    status: "hidden",
    source: "manual",
    addedAt: "2026-08-30T18:00:00.000Z",
    lentTo: null,
  },
];
