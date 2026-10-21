import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import LibraryScreen from "@/app/(tabs)/library";
import { LibraryProvider } from "@/hooks/use-library";
import type { OwnedBook } from "@/types/book";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

const base = {
  isbn: null,
  coverUrl: null,
  personalRating: null,
  personalReview: null,
  source: "manual",
  addedAt: "2026-10-01T12:00:00.000Z",
  lentTo: null,
  visibility: "everyone",
  info: null,
} as const;

const books: OwnedBook[] = [
  { ...base, id: "1", title: "Piranesi", author: "Susanna Clarke", status: "lent", lentTo: { name: "Arturo", dueDate: "2026-11-06" } },
  { ...base, id: "2", title: "The Overstory", author: "Richard Powers", status: "available" },
  { ...base, id: "3", title: "Station Eleven", author: "Emily St. John Mandel", status: "hidden" },
];

async function renderLibrary(initialBooks = books) {
  await render(
    <LibraryProvider initialBooks={initialBooks}>
      <LibraryScreen />
    </LibraryProvider>,
  );
}

describe("LibraryScreen", () => {
  it("lists every book with its status", async () => {
    await renderLibrary();

    expect(screen.getByText("My library")).toBeOnTheScreen();
    expect(screen.getByText("3 books")).toBeOnTheScreen();
    expect(screen.getByText("The Overstory")).toBeOnTheScreen();
    expect(screen.getByText("to Arturo · due Nov 6")).toBeOnTheScreen();
    expect(screen.getByText("Not shown to others")).toBeOnTheScreen();
  });

  it("marks friends-only books", async () => {
    await renderLibrary([{ ...books[1], visibility: "friends" }]);

    expect(screen.getByText("Friends only")).toBeOnTheScreen();
  });

  it("makes every book friends-only with the library switch", async () => {
    await renderLibrary();
    expect(screen.queryByText("Friends only")).not.toBeOnTheScreen();

    await fireEvent(screen.getByLabelText("Only friends can see my books"), "valueChange", true);

    // Lent and hidden books keep their own detail; the available book shows the new setting.
    expect(screen.getByText("Friends only")).toBeOnTheScreen();
    expect(screen.getByText("Applies to every book in your library.")).toBeOnTheScreen();
  });

  it("filters by status", async () => {
    await renderLibrary();

    await fireEvent.press(screen.getByRole("tab", { name: "Lent" }));

    expect(screen.getByText("Piranesi")).toBeOnTheScreen();
    expect(screen.queryByText("The Overstory")).not.toBeOnTheScreen();
    expect(screen.queryByText("Station Eleven")).not.toBeOnTheScreen();
  });

  it("explains an empty filter", async () => {
    await renderLibrary([books[1]]);

    await fireEvent.press(screen.getByRole("tab", { name: "Hidden" }));

    expect(screen.getByText("No hidden books.")).toBeOnTheScreen();
  });

  it("opens the scanner and the manual form", async () => {
    await renderLibrary();

    await fireEvent.press(screen.getByRole("button", { name: "Scan" }));
    expect(router.push).toHaveBeenCalledWith("/scan");

    await fireEvent.press(screen.getByRole("button", { name: "Type it in" }));
    expect(router.push).toHaveBeenCalledWith("/add-book");
  });
});
