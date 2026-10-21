import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { useCameraPermissions } from "expo-camera";
import { router } from "expo-router";

import ScanScreen from "@/app/scan";
import { LibraryProvider, useLibrary } from "@/hooks/use-library";
import { lookupDescription, lookupIsbn } from "@/lib/book-lookup";
import type { OwnedBook } from "@/types/book";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useIsFocused: () => true,
}));

// Captures the scan handler so tests can "point the camera" at a barcode.
let mockOnScan: ((result: { type: string; data: string }) => void) | undefined;
jest.mock("expo-camera", () => ({
  CameraView: (props: { onBarcodeScanned?: (r: { type: string; data: string }) => void }) => {
    mockOnScan = props.onBarcodeScanned;
    return null;
  },
  useCameraPermissions: jest.fn(),
}));

jest.mock("@/lib/book-lookup", () => ({ lookupIsbn: jest.fn(), lookupDescription: jest.fn() }));

const mockPermissions = useCameraPermissions as jest.Mock;
const mockLookup = lookupIsbn as jest.Mock;
const mockDescription = lookupDescription as jest.Mock;

const info = { description: null, publisher: "Bloomsbury Publishing", publishedYear: 2020, pageCount: 245, subjects: ["Fiction"] };
const piranesi = { title: "Piranesi", author: "Susanna Clarke", coverUrl: null, info };

const owned: OwnedBook = {
  id: "owned-1",
  ...piranesi,
  isbn: "9781635575637",
  personalRating: null,
  personalReview: null,
  status: "available",
  source: "scan",
  addedAt: "2026-10-01T12:00:00.000Z",
  lentTo: null,
  visibility: "everyone",
  info: null,
};

// Prints saved lookup details so tests can see what was stored.
function InfoProbe() {
  const { books } = useLibrary();
  return books.map((b) => <Text key={b.id}>{`info:${b.info?.publisher}|${b.info?.description}`}</Text>);
}

async function renderScanner(initialBooks: OwnedBook[] = []) {
  await render(
    <LibraryProvider initialBooks={initialBooks}>
      <ScanScreen />
      <InfoProbe />
    </LibraryProvider>,
  );
}

async function scan(data: string, type = "ean13") {
  await act(async () => {
    mockOnScan?.({ type, data });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockOnScan = undefined;
  mockDescription.mockResolvedValue(null);
  mockPermissions.mockReturnValue([{ granted: true, canAskAgain: true }, jest.fn()]);
});

describe("ScanScreen", () => {
  it("adds a found book and keeps scanning", async () => {
    mockLookup.mockResolvedValue({ status: "found", book: piranesi });
    await renderScanner();
    expect(screen.getByText("Added this session: 0")).toBeOnTheScreen();

    await scan("9781635575637");
    expect(screen.getByText("Found it · ISBN 9781635575637")).toBeOnTheScreen();
    expect(screen.getByText("Piranesi")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Add & scan next" }));

    expect(screen.getByText("Added this session: 1")).toBeOnTheScreen();
    expect(screen.queryByText("Piranesi")).not.toBeOnTheScreen();
  });

  it("saves the lookup details and fetches the description after adding", async () => {
    mockLookup.mockResolvedValue({ status: "found", book: piranesi });
    mockDescription.mockResolvedValue("A house of endless halls.");
    await renderScanner();

    await scan("9781635575637");
    await fireEvent.press(screen.getByRole("button", { name: "Add & scan next" }));

    expect(mockDescription).toHaveBeenCalledWith("9781635575637");
    expect(await screen.findByText("info:Bloomsbury Publishing|A house of endless halls.")).toBeOnTheScreen();
  });

  it("passes the lookup details to the form when editing before adding", async () => {
    mockLookup.mockResolvedValue({ status: "found", book: piranesi });
    await renderScanner();

    await scan("9781635575637");
    await fireEvent.press(screen.getByRole("button", { name: "Edit details, rating or review" }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/add-book",
      params: expect.objectContaining({ info: JSON.stringify(info), source: "scan" }),
    });
  });

  it("skips a found book without adding it", async () => {
    mockLookup.mockResolvedValue({ status: "found", book: piranesi });
    await renderScanner();

    await scan("9781635575637");
    await fireEvent.press(screen.getByRole("button", { name: "Skip" }));

    expect(screen.getByText("Added this session: 0")).toBeOnTheScreen();
    expect(screen.queryByText("Piranesi")).not.toBeOnTheScreen();
  });

  it("ignores barcodes that are not books", async () => {
    await renderScanner();

    await scan("4006381333931");

    expect(mockLookup).not.toHaveBeenCalled();
  });

  it("says when the book is already in the library", async () => {
    await renderScanner([owned]);

    await scan("9781635575637");

    expect(screen.getByText("Already in your library")).toBeOnTheScreen();
    expect(mockLookup).not.toHaveBeenCalled();
  });

  it("opens the manual form with the ISBN when no service knows the book", async () => {
    const emptyInfo = { description: null, publisher: null, publishedYear: null, pageCount: null, subjects: [] };
    mockLookup.mockResolvedValue({ status: "not_found", prefill: { title: "Piranesi", author: "", coverUrl: null, info: emptyInfo } });
    await renderScanner();

    await scan("9781635575637");

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/add-book",
      params: { isbn: "9781635575637", title: "Piranesi", author: "", coverUrl: "", info: JSON.stringify(emptyInfo), source: "scan" },
    });
  });

  it("offers a retry when the lookup can't reach the network", async () => {
    mockLookup.mockResolvedValueOnce({ status: "error" }).mockResolvedValueOnce({ status: "found", book: piranesi });
    await renderScanner();

    await scan("9781635575637");
    expect(screen.getByText("Couldn't look up this book. Check your connection.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("Piranesi")).toBeOnTheScreen();
  });

  it("explains a denied camera permission and offers manual entry", async () => {
    mockPermissions.mockReturnValue([{ granted: false, canAskAgain: false }, jest.fn()]);
    await renderScanner();

    expect(screen.getByText(/needs your camera to read barcodes/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Enter it manually" }));

    expect(router.replace).toHaveBeenCalledWith("/add-book");
  });
});
