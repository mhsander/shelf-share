import type { ListedBook } from "@/types/book";

// Placeholder data until the Supabase `library_books` query is wired up.
export const sampleBooks: ListedBook[] = [
  { id: "1", title: "The Overstory", author: "Richard Powers", ownerName: "Ana", neighborhood: "Ballard", coverColor: "green" },
  { id: "2", title: "Piranesi", author: "Susanna Clarke", ownerName: "Ben", neighborhood: "Fremont", coverColor: "blue" },
  { id: "3", title: "Braiding Sweetgrass", author: "Robin Wall Kimmerer", ownerName: "Chloe", neighborhood: "Wallingford", coverColor: "rust" },
  { id: "4", title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", ownerName: "Dev", neighborhood: "Capitol Hill", coverColor: "purple" },
  { id: "5", title: "Station Eleven", author: "Emily St. John Mandel", ownerName: "Eli", neighborhood: "Ballard", coverColor: "navy" },
];
