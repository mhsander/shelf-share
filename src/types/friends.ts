// Another user's public profile fields (spec §6.5): never email, never exact location.
export type Person = {
  id: string;
  displayName: string;
  city: string;
  neighborhood: string | null;
  avatarUrl: string | null;
};

// How the signed-in user relates to someone else, from the `friendships` table.
export type Relationship = "friends" | "requestSent" | "requestReceived" | "none";
