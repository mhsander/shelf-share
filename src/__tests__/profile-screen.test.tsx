import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { Alert, Platform } from "react-native";

import ProfileScreen from "@/app/(tabs)/profile";
import { FriendsProvider } from "@/hooks/use-friends";
import { LibraryProvider } from "@/hooks/use-library";
import { ProfileProvider } from "@/hooks/use-profile";
import type { FriendsState } from "@/lib/friends";
import type { BookStatus, OwnedBook } from "@/types/book";
import type { BlockedUser, Profile } from "@/types/profile";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
const mockSignOut = jest.fn();
const mockDeleteAccount = jest.fn();
jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ signOut: mockSignOut, deleteAccount: mockDeleteAccount }),
}));

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
let restoreWebDialogs: (() => void) | null = null;

function useWebDialogs() {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const confirm = jest.fn();
  const alert = jest.fn();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { confirm, alert },
  });
  const platform = jest.replaceProperty(Platform, "OS", "web");
  restoreWebDialogs = () => {
    platform.restore();
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
    restoreWebDialogs = null;
  };
  return { confirm, alert };
}

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
});

afterEach(() => {
  restoreWebDialogs?.();
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
    expect(router.push).toHaveBeenCalledWith("/privacy");

    await fireEvent.press(screen.getByRole("button", { name: "Terms" }));
    expect(router.push).toHaveBeenCalledWith("/terms");
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

  it("uses browser confirmations for sign out and account deletion", async () => {
    const dialogs = useWebDialogs();
    await renderProfile();

    dialogs.confirm.mockReturnValueOnce(false);
    await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    expect(dialogs.confirm).toHaveBeenCalledWith("Sign out?");
    expect(mockSignOut).not.toHaveBeenCalled();

    dialogs.confirm.mockReturnValueOnce(true);
    await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());

    dialogs.confirm.mockReturnValueOnce(true);
    await fireEvent.press(screen.getByRole("button", { name: "Delete account" }));
    expect(dialogs.confirm).toHaveBeenLastCalledWith(
      expect.stringContaining("This deletes your profile, books, and photo."),
    );
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalled());
  });

  it("shows account-deletion errors in the browser", async () => {
    const dialogs = useWebDialogs();
    mockDeleteAccount.mockRejectedValue(new Error("network unavailable"));
    await renderProfile();

    dialogs.confirm.mockReturnValueOnce(true);
    await fireEvent.press(screen.getByRole("button", { name: "Delete account" }));

    await waitFor(() =>
      expect(dialogs.alert).toHaveBeenCalledWith(
        "Couldn't delete your account\n\nnetwork unavailable",
      ),
    );
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
