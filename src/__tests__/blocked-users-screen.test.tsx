import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { Alert } from "react-native";

import BlockedUsersScreen from "@/app/blocked-users";
import { ProfileProvider } from "@/hooks/use-profile";
import type { BlockedUser, Profile } from "@/types/profile";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));

const profile: Profile = { displayName: "Ana", city: "Seattle", neighborhood: null, avatarUrl: null };
const blocked: BlockedUser[] = [
  { id: "b1", displayName: "Chloe" },
  { id: "b2", displayName: "Dev" },
];

async function renderScreen(initialBlocked = blocked) {
  await render(
    <ProfileProvider initialProfile={profile} initialBlocked={initialBlocked}>
      <BlockedUsersScreen />
    </ProfileProvider>,
  );
}

// Presses the named button in the most recent Alert.alert call.
async function chooseInAlert(text: string) {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  const buttons = calls[calls.length - 1][2] as { text: string; onPress?: () => void }[];
  await act(async () => buttons.find((b) => b.text === text)?.onPress?.());
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

describe("BlockedUsersScreen", () => {
  it("lists blocked users", async () => {
    await renderScreen();

    expect(screen.getByText("Chloe")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Unblock Chloe" })).toBeOnTheScreen();
    expect(screen.getByText("Dev")).toBeOnTheScreen();
  });

  it("unblocks after confirmation", async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Unblock Chloe" }));
    expect(Alert.alert).toHaveBeenCalledWith("Unblock Chloe?", expect.any(String), expect.any(Array));
    await chooseInAlert("Unblock");

    expect(screen.queryByText("Chloe")).not.toBeOnTheScreen();
    expect(screen.getByText("Dev")).toBeOnTheScreen();
  });

  it("keeps the user blocked when cancelled", async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Unblock Chloe" }));
    await chooseInAlert("Cancel");

    expect(screen.getByText("Chloe")).toBeOnTheScreen();
  });

  it("shows the empty state", async () => {
    await renderScreen([]);

    expect(screen.getByText("You haven't blocked anyone.")).toBeOnTheScreen();
  });

  it("goes back", async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(router.back).toHaveBeenCalled();
  });
});
