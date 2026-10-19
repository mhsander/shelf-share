import { fireEvent, render, screen } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";

import BookDetailScreen from "@/app/book/[id]";
import { BookCard } from "@/components/book-card";
import { sampleBooks } from "@/data/sample-books";
import { sampleFriends } from "@/data/sample-people";
import { FriendsProvider } from "@/hooks/use-friends";

async function renderDetail() {
  await render(
    <FriendsProvider initialState={sampleFriends}>
      <BookDetailScreen />
    </FriendsProvider>,
  );
}

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
    await renderDetail();

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
    await renderDetail();

    expect(screen.queryByText("OWNER'S NOTE")).not.toBeOnTheScreen();
  });

  it("shows a not-found state for an unknown id", async () => {
    showBook("missing");
    await renderDetail();

    expect(screen.getByText("This book isn't available anymore.")).toBeOnTheScreen();
  });

  it("goes back from the back button", async () => {
    showBook(sampleBooks[0].id);
    await renderDetail();

    await fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(router.back).toHaveBeenCalled();
  });
});

describe("BookDetailScreen about this book", () => {
  it("shows publication details and the description from the scan", async () => {
    const book = sampleBooks.find((b) => b.id === "2")!;
    showBook(book.id);
    await renderDetail();

    expect(screen.getByText("ABOUT THIS BOOK")).toBeOnTheScreen();
    expect(screen.getByText("Bloomsbury Publishing · 2020 · 245 pages")).toBeOnTheScreen();
    expect(screen.getByText(book.info!.description!)).toBeOnTheScreen();
    expect(screen.getByText("Labyrinths")).toBeOnTheScreen();
  });

  it("leaves the section out for a book without lookup details", async () => {
    showBook("4");
    await renderDetail();

    expect(screen.queryByText("ABOUT THIS BOOK")).not.toBeOnTheScreen();
  });
});

describe("BookDetailScreen friends", () => {
  it("marks a friend's friends-only book", async () => {
    showBook("5");
    await renderDetail();

    expect(screen.getByText("Friends only")).toBeOnTheScreen();
  });

  it("doesn't show a friends-only book from someone who isn't a friend", async () => {
    showBook("6");
    await renderDetail();

    expect(screen.getByText("This book isn't available anymore.")).toBeOnTheScreen();
  });

  it("opens the owner's profile", async () => {
    const book = sampleBooks[0];
    showBook(book.id);
    await renderDetail();

    await fireEvent.press(screen.getByRole("button", { name: `${book.ownerName}'s profile` }));

    expect(router.push).toHaveBeenCalledWith({ pathname: "/user/[id]", params: { id: book.ownerId } });
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
