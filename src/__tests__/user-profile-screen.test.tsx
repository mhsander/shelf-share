import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";

import UserProfileScreen from "@/app/users/[id]";
import { usePublicProfile } from "@/hooks/use-books";
import { useFriends } from "@/hooks/use-friends";

const mockSendRequest = jest.fn();
const profile = {
  id: "user-b",
  displayName: "Ben",
  city: "Seattle",
  neighborhood: "Fremont",
  avatarUrl: null,
  books: [{
    id: "book-1",
    ownerId: "user-b",
    title: "Piranesi",
    author: "Susanna Clarke",
    ownerName: "Ben",
    neighborhood: "Fremont",
    coverColor: "blue" as const,
    coverUrl: null,
  }],
};

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-a" } } }),
}));
jest.mock("@/hooks/use-books", () => ({
  usePublicProfile: jest.fn(),
}));
jest.mock("@/hooks/use-friends", () => ({
  useFriends: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "user-b" });
  (usePublicProfile as jest.Mock).mockReturnValue({ data: profile, isLoading: false, error: null });
  (useFriends as jest.Mock).mockReturnValue({
    friends: [],
    requests: [],
    sendRequest: mockSendRequest,
    accept: jest.fn(),
    decline: jest.fn(),
    cancelRequest: jest.fn(),
  });
  mockSendRequest.mockResolvedValue(undefined);
});

describe("UserProfileScreen", () => {
  it("shows profile data and books returned by the database hook", async () => {
    await render(<UserProfileScreen />);
    expect(screen.getByText("Ben")).toBeOnTheScreen();
    expect(screen.getByText("Fremont · Seattle")).toBeOnTheScreen();
    expect(screen.getByText("Piranesi")).toBeOnTheScreen();
  });

  it("sends a friend request through the friends hook", async () => {
    await render(<UserProfileScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Add friend" }));
    await waitFor(() => expect(mockSendRequest).toHaveBeenCalledWith(expect.objectContaining({ id: "user-b" })));
  });

  it("opens the report form for this user", async () => {
    await render(<UserProfileScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Report user" }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/report/[userId]",
      params: { userId: profile.id },
    });
  });

  it("opens a selected book", async () => {
    await render(<UserProfileScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Piranesi by Susanna Clarke" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/books/[id]", params: { id: "book-1" } });
  });

  it("shows an unavailable state when the profile is missing", async () => {
    (usePublicProfile as jest.Mock).mockReturnValue({ data: null, isLoading: false, error: null });
    await render(<UserProfileScreen />);
    expect(screen.getByText("This profile is unavailable.")).toBeOnTheScreen();
  });
});
