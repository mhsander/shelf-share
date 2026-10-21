import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { Alert } from "react-native";

import ProfileScreen from "@/app/(tabs)/profile";
import { links } from "@/constants/links";
import { FriendsProvider } from "@/hooks/use-friends";
import { LibraryProvider } from "@/hooks/use-library";
import { ProfileProvider } from "@/hooks/use-profile";
import type { FriendsState } from "@/lib/friends";
import type { BookStatus, OwnedBook } from "@/types/book";
import type { BlockedUser, Profile } from "@/types/profile";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));
const mockSignOut = jest.fn();
const mockDeleteAccount = jest.fn();
jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ signOut: mockSignOut, deleteAccount: mockDeleteAccount }),
}));

const mockOpen = openBrowserAsync as jest.Mock;

function book(id: string, status: BookStatus): OwnedBook {
  return {
    id,
    title: `Book ${id}`,
    author: "Author",
    isbn: null,
    coverUrl: null,
    personalRating: null,
    personalReview: null,
    status,
    source: "manual",
    addedAt: "2026-10-01T12:00:00.000Z",
    lentTo: status === "lent" ? { name: "Arturo", dueDate: "2026-11-06" } : null,
    visibility: "everyone",
    info: null,
  };
}

const books = [
  book("1", "available"),
  book("2", "available"),
  book("3", "lent"),
  book("4", "hidden"),
];
const profile: Profile = {
  displayName: "Ana María Ruiz",
  city: "Seattle",
  neighborhood: "Capitol Hill",
  avatarUrl: null,
};
const blocked: BlockedUser[] = [{ id: "b1", displayName: "Chloe" }];
const noFriends: FriendsState = { friends: [], incoming: [], outgoing: [] };

async function renderProfile(overrides: Partial<Profile> = {}) {
  await render(
    <LibraryProvider initialBooks={books}>
      <ProfileProvider
        initialProfile={{ ...profile, ...overrides }}
        initialBlocked={blocked}
      >
        <FriendsProvider initialState={noFriends}>
          <ProfileScreen />
        </FriendsProvider>
      </ProfileProvider>
    </LibraryProvider>,
  );
}

// The buttons passed to the most recent Alert.alert call.
function lastAlertButtons() {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  return calls[calls.length - 1][2] as {
    text: string;
    style?: string;
    onPress?: () => void;
  }[];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockResolvedValue(undefined);
  mockDeleteAccount.mockResolvedValue(undefined);
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  mockOpen.mockResolvedValue({ type: "opened" });
});

describe("ProfileScreen", () => {
  it("shows the profile card", async () => {
    await renderProfile();

    expect(screen.getByText("Ana María Ruiz")).toBeOnTheScreen();
    expect(screen.getByText("AR")).toBeOnTheScreen();
    expect(screen.getByText("Capitol Hill · Seattle")).toBeOnTheScreen();
    expect(
      screen.getByText("4 books · 2 available · 1 lent"),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/@/)).not.toBeOnTheScreen();
  });

  it("shows only the city without a neighborhood", async () => {
    await renderProfile({ neighborhood: null });

    expect(screen.getByText("Seattle")).toBeOnTheScreen();
    expect(screen.queryByText(/· Seattle/)).not.toBeOnTheScreen();
  });

  it("navigates to edit profile and blocked users", async () => {
    await renderProfile();

    await fireEvent.press(screen.getByRole("button", { name: "Edit profile" }));
    expect(router.push).toHaveBeenCalledWith("/edit-profile");

    expect(
      screen.getByRole("button", { name: "Blocked users" }),
    ).toHaveTextContent(/1/);
    await fireEvent.press(
      screen.getByRole("button", { name: "Blocked users" }),
    );
    expect(router.push).toHaveBeenCalledWith("/blocked-users");
  });

  it("opens the privacy policy and terms", async () => {
    await renderProfile();

    await fireEvent.press(
      screen.getByRole("button", { name: "Privacy policy" }),
    );
    expect(mockOpen).toHaveBeenCalledWith(links.privacy);
  });

  it("reports a link that fails to open", async () => {
    mockOpen.mockRejectedValue(new Error("no browser"));
    await renderProfile();

    await fireEvent.press(
      screen.getByRole("button", { name: "Privacy policy" }),
    );

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith("Couldn't open the page."),
    );
  });

  it("asks before signing out", async () => {
    await renderProfile();

    await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Sign out?",
      undefined,
      expect.any(Array),
    );
    expect(lastAlertButtons().map((b) => b.text)).toEqual([
      "Cancel",
      "Sign out",
    ]);
    lastAlertButtons()[1].onPress?.();
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
  });

  it("explains what deleting the account removes", async () => {
    await renderProfile();

    await fireEvent.press(
      screen.getByRole("button", { name: "Delete account" }),
    );

    const [title, message] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(title).toBe("Delete your account?");
    expect(message).toContain("profile, books, and photo");
    expect(message).toContain("Deleted user");
    expect(lastAlertButtons()).toEqual([
      expect.objectContaining({ text: "Cancel" }),
      expect.objectContaining({ text: "Delete", style: "destructive" }),
    ]);
    lastAlertButtons()[1].onPress?.();
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalled());
  });

  it("surfaces an account-deletion error", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("network unavailable"));
    await renderProfile();

    await fireEvent.press(screen.getByRole("button", { name: "Delete account" }));
    lastAlertButtons()[1].onPress?.();

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenLastCalledWith(
        "Couldn't delete your account",
        "network unavailable",
      ),
    );
  });
});
