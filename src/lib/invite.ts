import { createURL } from "expo-linking";

// Link that opens the invite screen, which sends a friend request to the inviter.
// TODO: switch to an https universal link once there's a web domain (spec §13); custom-scheme
// links aren't tappable in every messaging app and don't help people who haven't installed the app.
export function inviteUrl(code: string): string {
  return createURL(`invite/${code}`);
}

export function inviteMessage(code: string): string {
  return `Borrow books from my shelf on Shelf Share: ${inviteUrl(code)}`;
}
