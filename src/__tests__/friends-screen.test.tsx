import { fireEvent, render, screen } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Share, Text } from "react-native";

import FriendsScreen from "@/app/friends";
import InviteScreen from "@/app/invite/[code]";
import { samplePeople } from "@/data/sample-people";
import { FriendsProvider, useFriends } from "@/hooks/use-friends";
import type { FriendsState } from "@/lib/friends";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.mock("expo-linking", () => ({ createURL: (path: string) => `shelfshare://${path}` }));

const person = (id: string) => samplePeople.find((p) => p.id === id)!;
const state: FriendsState = { friends: [person("p-amir")], incoming: [person("p-arturo")], outgoing: [person("p-dev")] };

async function renderFriends(initial = state) {
  await render(
    <FriendsProvider initialState={initial}>
      <FriendsScreen />
    </FriendsProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe("FriendsScreen", () => {
  it("lists requests, friends, and sent requests", async () => {
    await renderFriends();

    expect(screen.getByText("Requests")).toBeOnTheScreen();
    expect(screen.getByText("Arturo")).toBeOnTheScreen();
    expect(screen.getByText("Amir")).toBeOnTheScreen();
    expect(screen.getByText("Sent")).toBeOnTheScreen();
    expect(screen.getByText("Dev")).toBeOnTheScreen();
  });

  it("accepts a request", async () => {
    await renderFriends();

    await fireEvent.press(screen.getByRole("button", { name: "Accept Arturo" }));

    expect(screen.queryByText("Requests")).not.toBeOnTheScreen();
    expect(screen.getByText("Arturo")).toBeOnTheScreen();
  });

  it("declines a request", async () => {
    await renderFriends();

    await fireEvent.press(screen.getByRole("button", { name: "Decline Arturo" }));

    expect(screen.queryByText("Arturo")).not.toBeOnTheScreen();
  });

  it("cancels a sent request", async () => {
    await renderFriends();

    await fireEvent.press(screen.getByRole("button", { name: "Cancel request to Dev" }));

    expect(screen.queryByText("Dev")).not.toBeOnTheScreen();
  });

  it("shows an empty state with no friends", async () => {
    await renderFriends({ friends: [], incoming: [], outgoing: [] });

    expect(screen.getByText("No friends yet. Invite someone to start sharing books.")).toBeOnTheScreen();
  });

  it("shares an invite link", async () => {
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction", activityType: undefined });
    await renderFriends();

    await fireEvent.press(screen.getByRole("button", { name: "Invite friends" }));

    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining("shelfshare://invite/") });
  });

  it("opens a friend's profile", async () => {
    await renderFriends();

    await fireEvent.press(screen.getByRole("button", { name: "Amir's profile" }));

    expect(router.push).toHaveBeenCalledWith({ pathname: "/users/[id]", params: { id: "p-amir" } });
  });
});

// Prints the relationship so tests can see what the invite did.
function RelationshipProbe({ id }: { id: string }) {
  const { relationshipWith } = useFriends();
  return <Text>{relationshipWith(id)}</Text>;
}

describe("InviteScreen", () => {
  async function renderInvite(code: string) {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ code });
    await render(
      <FriendsProvider initialState={{ friends: [], incoming: [], outgoing: [] }}>
        <InviteScreen />
        <RelationshipProbe id={code} />
      </FriendsProvider>,
    );
  }

  it("sends a friend request to the inviter", async () => {
    await renderInvite("p-chloe");

    expect(screen.getByText("Chloe invited you")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Add Chloe as a friend" }));

    expect(screen.getByText("requestSent")).toBeOnTheScreen();
    expect(router.replace).toHaveBeenCalledWith({ pathname: "/users/[id]", params: { id: "p-chloe" } });
  });

  it("explains an invalid link", async () => {
    await renderInvite("bogus");

    expect(screen.getByText("This invite link isn't valid anymore.")).toBeOnTheScreen();
  });
});
