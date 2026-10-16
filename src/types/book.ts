import type { CoverColor } from "@/constants/theme";

// A book another user has listed as available, as shown in search results.
export type ListedBook = {
  id: string;
  title: string;
  author: string;
  ownerName: string;
  neighborhood: string;
  coverColor: CoverColor;
};
