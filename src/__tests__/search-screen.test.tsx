import { fireEvent, render, screen } from "@testing-library/react-native";

import SearchScreen from "@/app/(tabs)/index";
import { sampleBooks } from "@/data/sample-books";

describe("SearchScreen", () => {
  it("lists new books in the user's city", async () => {
    await render(<SearchScreen />);

    expect(screen.getByText("Find a book")).toBeOnTheScreen();
    expect(screen.getByText("New in your city")).toBeOnTheScreen();
    expect(screen.getByText(sampleBooks[0].title)).toBeOnTheScreen();
  });

  it("filters the list by title or author", async () => {
    const [first, second] = sampleBooks;
    await render(<SearchScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText("Title or author"), first.author);

    expect(screen.getByText(first.title)).toBeOnTheScreen();
    expect(screen.queryByText(second.title)).not.toBeOnTheScreen();
  });

  it("shows an empty state when nothing matches", async () => {
    await render(<SearchScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText("Title or author"), "zzzz no match");

    expect(screen.getByText("No books match your search yet.")).toBeOnTheScreen();
  });
});
