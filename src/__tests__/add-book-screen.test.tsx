import { fireEvent, render, screen } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

import AddBookScreen from "@/app/add-book";
import { LibraryProvider, useLibrary } from "@/hooks/use-library";
import type { OwnedBook } from "@/types/book";

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const mockParams = useLocalSearchParams as jest.Mock;

const owned: OwnedBook = {
  id: "owned-1",
  title: "Piranesi",
  author: "Susanna Clarke",
  isbn: "9781635575637",
  coverUrl: null,
  personalRating: 3,
  personalReview: null,
  status: "available",
  source: "scan",
  addedAt: "2026-10-01T12:00:00.000Z",
  lentTo: null,
  visibility: "everyone",
};

// Prints the library so tests can see what was saved.
function LibraryProbe() {
  const { books } = useLibrary();
  return books.map((b) => <Text key={b.id}>{`${b.title}|${b.author}|${b.isbn}|${b.personalRating}|${b.source}|${b.visibility}`}</Text>);
}

async function renderForm(initialBooks: OwnedBook[] = []) {
  await render(
    <LibraryProvider initialBooks={initialBooks}>
      <AddBookScreen />
      <LibraryProbe />
    </LibraryProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.mockReturnValue({});
});

describe("AddBookScreen", () => {
  it("requires a title and an author", async () => {
    await renderForm();

    await fireEvent.press(screen.getByRole("button", { name: "Add to library" }));

    expect(screen.getByText("Add a title.")).toBeOnTheScreen();
    expect(screen.getByText("Add an author.")).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("rejects an invalid ISBN", async () => {
    await renderForm();

    await fireEvent.changeText(screen.getByLabelText("Title"), "Piranesi");
    await fireEvent.changeText(screen.getByLabelText("Author"), "Susanna Clarke");
    await fireEvent.changeText(screen.getByLabelText("ISBN (optional)"), "12345");
    await fireEvent.press(screen.getByRole("button", { name: "Add to library" }));

    expect(screen.getByText("That ISBN doesn't look right. Check the digits or leave it blank.")).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("saves a typed-in book, converting an ISBN-10", async () => {
    await renderForm();

    await fireEvent.changeText(screen.getByLabelText("Title"), "  The Left Hand of Darkness ");
    await fireEvent.changeText(screen.getByLabelText("Author"), "Ursula K. Le Guin");
    await fireEvent.changeText(screen.getByLabelText("ISBN (optional)"), "0-441-47812-3");
    await fireEvent.press(screen.getByRole("button", { name: "Rate 4 stars" }));
    await fireEvent.press(screen.getByRole("button", { name: "Add to library" }));

    expect(screen.getByText("The Left Hand of Darkness|Ursula K. Le Guin|9780441478125|4|manual|everyone")).toBeOnTheScreen();
    expect(router.back).toHaveBeenCalled();
  });

  it("saves a book as friends-only", async () => {
    await renderForm();

    await fireEvent.changeText(screen.getByLabelText("Title"), "Piranesi");
    await fireEvent.changeText(screen.getByLabelText("Author"), "Susanna Clarke");
    await fireEvent.press(screen.getByRole("tab", { name: "Friends only" }));
    await fireEvent.press(screen.getByRole("button", { name: "Add to library" }));

    expect(screen.getByText("Piranesi|Susanna Clarke|null|null|manual|friends")).toBeOnTheScreen();
  });

  it("explains when the whole library is friends-only", async () => {
    await render(
      <LibraryProvider initialBooks={[]} initialAllFriendsOnly>
        <AddBookScreen />
      </LibraryProvider>,
    );

    expect(screen.getByText("Friends only. Your whole library is friends-only; change this in My library.")).toBeOnTheScreen();
    expect(screen.queryByRole("tab", { name: "Everyone" })).not.toBeOnTheScreen();
  });

  it("says when the ISBN is already in the library", async () => {
    await renderForm([owned]);

    await fireEvent.changeText(screen.getByLabelText("Title"), "Piranesi");
    await fireEvent.changeText(screen.getByLabelText("Author"), "Susanna Clarke");
    await fireEvent.changeText(screen.getByLabelText("ISBN (optional)"), "9781635575637");
    await fireEvent.press(screen.getByRole("button", { name: "Add to library" }));

    expect(screen.getByText("Already in your library.")).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("prefills from a scan and saves it as scanned", async () => {
    mockParams.mockReturnValue({ isbn: "9780441478125", title: "The Left Hand of Darkness", source: "scan" });
    await renderForm();

    expect(screen.getByLabelText("Title").props.value).toBe("The Left Hand of Darkness");
    await fireEvent.changeText(screen.getByLabelText("Author"), "Ursula K. Le Guin");
    await fireEvent.press(screen.getByRole("button", { name: "Add to library" }));

    expect(screen.getByText("The Left Hand of Darkness|Ursula K. Le Guin|9780441478125|null|scan|everyone")).toBeOnTheScreen();
  });

  it("edits an existing book", async () => {
    mockParams.mockReturnValue({ id: "owned-1" });
    await renderForm([owned]);

    expect(screen.getByText("Edit book")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Rate 5 stars" }));
    await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("Piranesi|Susanna Clarke|9781635575637|5|scan|everyone")).toBeOnTheScreen();
    expect(router.back).toHaveBeenCalled();
  });
});
