import type { OwnedBook } from "@/types/book";
import type { ProfileDraft, ProfileErrors, ProfileFields } from "@/types/profile";

// Matches the 1–60 character check on `profiles.display_name`.
export const MAX_DISPLAY_NAME = 60;

export type ProfileValidation = { ok: true; profile: ProfileFields } | { ok: false; errors: ProfileErrors };

export function validateProfile(draft: ProfileDraft): ProfileValidation {
  const displayName = draft.displayName.trim();
  const city = draft.city.trim();
  const neighborhood = draft.neighborhood.trim();

  const errors: ProfileErrors = {};
  if (!displayName) errors.displayName = "Add your name.";
  else if (displayName.length > MAX_DISPLAY_NAME) errors.displayName = `Use ${MAX_DISPLAY_NAME} characters or fewer.`;
  if (!city) errors.city = "Add your city.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, profile: { displayName, city, neighborhood: neighborhood || null } };
}

// First letters of the first and last words, e.g. "Ana María Ruiz" → "AR".
export function initials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function libraryCounts(books: OwnedBook[]) {
  return {
    total: books.length,
    available: books.filter((b) => b.status === "available").length,
    lent: books.filter((b) => b.status === "lent").length,
  };
}
