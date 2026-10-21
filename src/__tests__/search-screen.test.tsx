import { fireEvent, render, screen } from "@testing-library/react-native";

import SearchScreen from "@/app/(tabs)/index";
import { sampleBooks } from "@/data/sample-books";
import { FriendsProvider } from "@/hooks/use-friends";
import type { FriendsState } from "@/lib/friends";

const noFriends: FriendsState = { friends: [], incoming: [], outgoing: [] };
const eli = { id: "p-eli", displayName: "Eli", city: "Seattle", neighborhood: "Ballard", avatarUrl: null };

async function renderSearch(friends: FriendsState = noFriends) {
  await render(
    <FriendsProvider initialState={friends}>
      <SearchScreen />
    </FriendsProvider>,
  );
}

jest.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    profile: { displayName: "Ana", city: "Seattle", neighborhood: null, avatarUrl: null },
  }),
}));
jest.mock("@/hooks/use-books", () => {
  const { sampleBooks: books } = jest.requireActual("@/data/sample-books") as typeof import("@/data/sample-books");
  const { filterBooks: filter } = jest.requireActual("@/lib/filter-books") as typeof import("@/lib/filter-books");
  return {
    useSearchBooks: (query: string) => ({
      data: filter(books, query),
      isLoading: false,
      error: null,
    }),
  };
});

describe("SearchScreen", () => {
  it("lists new books in the user's city", async () => {
    await renderSearch();

    expect(screen.getByText("Find a book")).toBeOnTheScreen();
    expect(screen.getByText("New in your city")).toBeOnTheScreen();
    expect(screen.getByText(sampleBooks[0].title)).toBeOnTheScreen();
  });

  it("filters the list by title or author", async () => {
    const [first, second] = sampleBooks;
    await renderSearch();

    await fireEvent.changeText(screen.getByPlaceholderText("Title or author"), first.author);

    expect(screen.getByText(first.title)).toBeOnTheScreen();
    expect(screen.queryByText(second.title)).not.toBeOnTheScreen();
  });

  it("shows an empty state when nothing matches", async () => {
    await renderSearch();

    await fireEvent.changeText(screen.getByPlaceholderText("Title or author"), "zzzz no match");

    expect(screen.getByText("No books match your search yet.")).toBeOnTheScreen();
  });

  it("hides friends-only books from people who aren't friends", async () => {
    await renderSearch();

    expect(screen.queryByText("Station Eleven")).not.toBeOnTheScreen();
    expect(screen.queryByText("A Wizard of Earthsea")).not.toBeOnTheScreen();
  });

  it("shows a friend's friends-only books", async () => {
    await renderSearch({ ...noFriends, friends: [eli] });

    expect(screen.getByText("Station Eleven")).toBeOnTheScreen();
    expect(screen.queryByText("A Wizard of Earthsea")).not.toBeOnTheScreen();
  });

  it("filters to books owned by friends", async () => {
    await renderSearch({ ...noFriends, friends: [eli] });

    await fireEvent.press(screen.getByRole("button", { name: "Friends' books" }));

    expect(screen.getByText("From your friends")).toBeOnTheScreen();
    expect(screen.getByText("Station Eleven")).toBeOnTheScreen();
    expect(screen.queryByText("The Overstory")).not.toBeOnTheScreen();
  });

  it("suggests adding friends when the friends filter has nobody to show", async () => {
    await renderSearch();

    await fireEvent.press(screen.getByRole("button", { name: "Friends' books" }));

    expect(screen.getByText("Add friends to see their books here.")).toBeOnTheScreen();
  });
});
