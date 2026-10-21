import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import { Alert } from "react-native";

import UserProfileScreen from "@/app/user/[id]";
import { samplePeople } from "@/data/sample-people";
import { FriendsProvider } from "@/hooks/use-friends";
import type { FriendsState } from "@/lib/friends";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const person = (id: string) => samplePeople.find((p) => p.id === id)!;
const dev = person("p-dev");
const eli = person("p-eli");
const empty: FriendsState = { friends: [], incoming: [], outgoing: [] };

async function renderProfile(id: string, state: FriendsState = empty) {
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id });
  await render(
    <FriendsProvider initialState={state}>
      <UserProfileScreen />
    </FriendsProvider>,
  );
}

async function chooseInAlert(text: string) {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  const buttons = calls[calls.length - 1][2] as { text: string; onPress?: () => void }[];
  await act(async () => buttons.find((b) => b.text === text)?.onPress?.());
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

describe("UserProfileScreen", () => {
  it("shows public profile fields and the books you can see", async () => {
    await renderProfile("p-dev");

    expect(screen.getByText("Dev")).toBeOnTheScreen();
    expect(screen.getByText("Capitol Hill · Seattle")).toBeOnTheScreen();
    expect(screen.getByText("The Left Hand of Darkness")).toBeOnTheScreen();
    // Dev's friends-only book stays hidden until you're friends.
    expect(screen.queryByText("A Wizard of Earthsea")).not.toBeOnTheScreen();
  });

  it("shows friends-only books to friends", async () => {
    await renderProfile("p-dev", { ...empty, friends: [dev] });

    expect(screen.getByText("A Wizard of Earthsea")).toBeOnTheScreen();
  });

  it("sends and cancels a friend request", async () => {
    await renderProfile("p-dev");

    await fireEvent.press(screen.getByRole("button", { name: "Add friend" }));
    expect(screen.getByRole("button", { name: "Request sent" })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Request sent" }));
    await chooseInAlert("Cancel request");
    expect(screen.getByRole("button", { name: "Add friend" })).toBeOnTheScreen();
  });

  it("accepts a request from them", async () => {
    await renderProfile("p-eli", { ...empty, incoming: [eli] });

    expect(screen.queryByText("Station Eleven")).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Accept" }));

    expect(screen.getByRole("button", { name: "Friends" })).toBeOnTheScreen();
    expect(screen.getByText("Station Eleven")).toBeOnTheScreen();
  });

  it("removes a friend after confirming", async () => {
    await renderProfile("p-eli", { ...empty, friends: [eli] });

    await fireEvent.press(screen.getByRole("button", { name: "Friends" }));
    await chooseInAlert("Remove");

    expect(screen.getByRole("button", { name: "Add friend" })).toBeOnTheScreen();
    expect(screen.queryByText("Station Eleven")).not.toBeOnTheScreen();
  });

  it("shows a not-found state for an unknown user", async () => {
    await renderProfile("nobody");

    expect(screen.getByText("This profile isn't available.")).toBeOnTheScreen();
  });
});
