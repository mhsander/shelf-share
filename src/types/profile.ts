// The signed-in user's own `profiles` row. Email lives only in `auth.users` and never appears here.
export type Profile = {
  displayName: string;
  city: string;
  neighborhood: string | null;
  avatarUrl: string | null;
};

// Someone the signed-in user has blocked (a `blocks` row joined to the blocked profile).
export type BlockedUser = {
  id: string;
  displayName: string;
};

// Raw text from the edit form, before validation.
export type ProfileDraft = {
  displayName: string;
  city: string;
  neighborhood: string;
};

export type ProfileFields = Omit<Profile, "avatarUrl">;
export type ProfileErrors = Partial<Record<"displayName" | "city", string>>;
