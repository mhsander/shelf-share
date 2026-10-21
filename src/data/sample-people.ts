import type { FriendsState } from "@/lib/friends";
import type { Person } from "@/types/friends";

// Placeholder data until profiles and `friendships` are read from Supabase.
export const samplePeople: Person[] = [
  { id: "p-amir", displayName: "Amir", city: "Seattle", neighborhood: "Ballard", avatarUrl: null },
  { id: "p-arturo", displayName: "Arturo", city: "Seattle", neighborhood: "Fremont", avatarUrl: null },
  { id: "p-chloe", displayName: "Chloe", city: "Seattle", neighborhood: "Wallingford", avatarUrl: null },
  { id: "p-dev", displayName: "Dev", city: "Seattle", neighborhood: "Capitol Hill", avatarUrl: null },
  { id: "p-eli", displayName: "Eli", city: "Seattle", neighborhood: "Ballard", avatarUrl: null },
];

const byId = (id: string) => samplePeople.find((p) => p.id === id)!;

export const sampleFriends: FriendsState = {
  friends: [byId("p-amir"), byId("p-eli")],
  incoming: [byId("p-arturo")],
  outgoing: [],
};
