import { fireEvent, render, screen } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";

import BookDetailScreen from "@/app/book/[id]";
import { BookCard } from "@/components/book-card";
import { sampleBooks } from "@/data/sample-books";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

function showBook(id: string) {
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id });
}

beforeEach(() => jest.clearAllMocks());

describe("BookDetailScreen", () => {
  it("shows the book, its owner, and the owner's note", async () => {
    const book = sampleBooks[0];
    showBook(book.id);
    await render(<BookDetailScreen />);

    expect(screen.getByText(book.title)).toBeOnTheScreen();
    expect(screen.getByText(book.author)).toBeOnTheScreen();
    expect(screen.getByText("Available")).toBeOnTheScreen();
    expect(screen.getByText(book.ownerName)).toBeOnTheScreen();
    expect(screen.getByText(`${book.neighborhood} · ${book.ownerBookCount} books to lend`)).toBeOnTheScreen();
    expect(screen.getByText(book.personalReview!)).toBeOnTheScreen();
    expect(screen.getByLabelText(`Rated ${book.personalRating} out of 5`)).toBeOnTheScreen();
    expect(screen.getByText(`Message to ${book.ownerName} (optional)`)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Ask to borrow" })).toBeOnTheScreen();
  });

  it("hides the owner's note when there isn't one", async () => {
    const book = sampleBooks.find((b) => b.personalRating === null && b.personalReview === null)!;
    showBook(book.id);
    await render(<BookDetailScreen />);

    expect(screen.queryByText("OWNER'S NOTE")).not.toBeOnTheScreen();
  });

  it("shows a not-found state for an unknown id", async () => {
    showBook("missing");
    await render(<BookDetailScreen />);

    expect(screen.getByText("This book isn't available anymore.")).toBeOnTheScreen();
  });

  it("goes back from the back button", async () => {
    showBook(sampleBooks[0].id);
    await render(<BookDetailScreen />);

    await fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(router.back).toHaveBeenCalled();
  });
});

describe("BookCard", () => {
  it("opens the book detail screen when pressed", async () => {
    const book = sampleBooks[1];
    await render(<BookCard book={book} />);

    await fireEvent.press(screen.getByRole("button", { name: `${book.title} by ${book.author}` }));

    expect(router.push).toHaveBeenCalledWith({ pathname: "/book/[id]", params: { id: book.id } });
  });
});
