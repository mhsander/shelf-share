import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import UserProfileScreen from "@/app/users/[id]";

const mockSendFriendRequest = jest.fn();

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: "user-b" }),
}));
jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-a" } } }),
}));
jest.mock("@/hooks/use-books", () => ({
  usePublicProfile: () => ({
    isLoading: false,
    error: null,
    data: {
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
        coverColor: "blue",
        coverUrl: null,
      }],
    },
  }),
}));
jest.mock("@/hooks/use-friends", () => ({
  useFriends: () => ({
    friends: [],
    requests: [],
    sendFriendRequest: mockSendFriendRequest,
    respondToFriendRequest: jest.fn(),
    cancelFriendRequest: jest.fn(),
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSendFriendRequest.mockResolvedValue(undefined);
});

describe("UserProfileScreen", () => {
  it("shows profile data and available books from the database hook", async () => {
    await render(<UserProfileScreen />);

    expect(screen.getByText("Ben")).toBeOnTheScreen();
    expect(screen.getByText("Fremont · Seattle")).toBeOnTheScreen();
    expect(screen.getByText("Piranesi")).toBeOnTheScreen();
  });

  it("sends a friend request through the friends hook", async () => {
    await render(<UserProfileScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Add friend" }));

    await waitFor(() => expect(mockSendFriendRequest).toHaveBeenCalledWith("user-b"));
  });

  it("opens the selected book", async () => {
    await render(<UserProfileScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Piranesi by Susanna Clarke" }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/books/[id]",
      params: { id: "book-1" },
    });
  });
});
