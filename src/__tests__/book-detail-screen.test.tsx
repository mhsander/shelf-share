import { fireEvent, render, screen } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";

import BookDetailScreen from "@/app/books/[id]";
import { BookCard } from "@/components/book-card";
import { useBookDetails } from "@/hooks/use-books";
import { invalidateBorrowRequests } from "@/hooks/use-requests";
import { requireSupabase } from "@/lib/supabase";

const mockRpc = jest.fn();
const mockInsert = jest.fn();

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ session: { user: { id: "borrower-id" } } }),
}));
jest.mock("@/hooks/use-books", () => ({
  useBookDetails: jest.fn(),
}));
jest.mock("@/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));
jest.mock("@/lib/query-client", () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));
jest.mock("@/hooks/use-requests", () => ({
  invalidateBorrowRequests: jest.fn(),
}));

const book = {
  id: "book-id",
  ownerId: "owner-id",
  title: "Piranesi",
  author: "Susanna Clarke",
  coverUrl: null,
  personalRating: 5,
  personalReview: "A beautiful book.",
  status: "available",
  owner: {
    displayName: "Ben",
    city: "Seattle",
    neighborhood: "Fremont",
    avatarUrl: null,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: book.id });
  (useBookDetails as jest.Mock).mockReturnValue({ data: book, isLoading: false, error: null });
  (requireSupabase as jest.Mock).mockReturnValue({
    rpc: mockRpc,
    from: jest.fn(() => ({ insert: mockInsert })),
  });
  mockRpc.mockResolvedValue({ data: "request-id", error: null });
  mockInsert.mockResolvedValue({ error: null });
});

describe("BookDetailScreen", () => {
  it("shows the book, its owner, and the owner's note", async () => {
    await render(<BookDetailScreen />);

    expect(screen.getAllByText(book.title)).toHaveLength(2);
    expect(screen.getByText(book.author)).toBeOnTheScreen();
    expect(screen.getByText("Available")).toBeOnTheScreen();
    expect(screen.getByText(book.owner.displayName)).toBeOnTheScreen();
    expect(screen.getByText(book.personalReview)).toBeOnTheScreen();
    expect(screen.getByLabelText("Rate 5 stars")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Ask to borrow" })).toBeOnTheScreen();
  });

  it("shows a not-found state for a missing book", async () => {
    (useBookDetails as jest.Mock).mockReturnValue({ data: null, isLoading: false, error: null });
    await render(<BookDetailScreen />);
    expect(screen.getByText("This book is no longer available.")).toBeOnTheScreen();
  });

  it("opens the owner's profile", async () => {
    await render(<BookDetailScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Ben's profile" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/users/[id]", params: { id: book.ownerId } });
  });

  it("creates a request, adds the optional first message, and opens its thread", async () => {
    await render(<BookDetailScreen />);
    await fireEvent.changeText(
      screen.getByPlaceholderText("Hi! Could I borrow this?"),
      "Could I pick it up this weekend?",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Ask to borrow" }));

    expect(mockRpc).toHaveBeenCalledWith("request_book", { p_book_id: book.id });
    expect(mockInsert).toHaveBeenCalledWith({
      request_id: "request-id",
      sender_id: "borrower-id",
      body: "Could I pick it up this weekend?",
    });
    expect(invalidateBorrowRequests).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/requests/[id]",
      params: { id: "request-id" },
    });
  });

  it("opens the book detail route from a search card", async () => {
    await render(
      <BookCard
        book={{
          id: book.id,
          title: book.title,
          author: book.author,
          ownerId: book.ownerId,
          ownerName: book.owner.displayName,
          neighborhood: book.owner.neighborhood!,
          coverColor: "blue",
          coverUrl: null,
        }}
      />,
    );
    await fireEvent.press(screen.getByRole("button", { name: `${book.title} by ${book.author}` }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/books/[id]", params: { id: book.id } });
  });
});
