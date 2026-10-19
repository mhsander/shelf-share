import type { BlockedUser, Profile } from "@/types/profile";

// Placeholder data until the Profile tab reads `profiles` and `blocks` from Supabase.
export const sampleProfile: Profile = {
  displayName: "Ana",
  city: "Seattle",
  neighborhood: "Capitol Hill",
  avatarUrl: null,
};

export const sampleBlocked: BlockedUser[] = [{ id: "sample-blocked-1", displayName: "Chloe" }];
