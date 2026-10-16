import { lookupIsbn } from "@/lib/book-lookup";

const isbn = "9781635575637";

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

const openLibraryHit = {
  [`ISBN:${isbn}`]: {
    title: "Piranesi",
    authors: [{ name: "Susanna Clarke" }],
    cover: { medium: "https://covers.openlibrary.org/b/id/1-M.jpg" },
  },
};

const googleHit = {
  totalItems: 1,
  items: [
    {
      volumeInfo: {
        title: "Piranesi",
        authors: ["Susanna Clarke"],
        imageLinks: { thumbnail: "http://books.google.com/books/content?id=1" },
      },
    },
  ],
};

describe("lookupIsbn", () => {
  it("uses Open Library when it has the book", async () => {
    const fetchFn = jest.fn().mockReturnValueOnce(json(openLibraryHit));

    await expect(lookupIsbn(isbn, fetchFn)).resolves.toEqual({
      status: "found",
      book: { title: "Piranesi", author: "Susanna Clarke", coverUrl: "https://covers.openlibrary.org/b/id/1-M.jpg" },
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toContain(`bibkeys=ISBN:${isbn}`);
  });

  it("falls back to Google Books when Open Library has no match", async () => {
    const fetchFn = jest.fn().mockReturnValueOnce(json({})).mockReturnValueOnce(json(googleHit));

    await expect(lookupIsbn(isbn, fetchFn)).resolves.toEqual({
      status: "found",
      // Google returns http thumbnails; upgrade them so they load on iOS.
      book: { title: "Piranesi", author: "Susanna Clarke", coverUrl: "https://books.google.com/books/content?id=1" },
    });
    expect(fetchFn.mock.calls[1][0]).toContain(`q=isbn:${isbn}`);
  });

  it("falls back to Google Books when Open Library fails", async () => {
    const fetchFn = jest.fn().mockRejectedValueOnce(new TypeError("Network request failed")).mockReturnValueOnce(json(googleHit));

    await expect(lookupIsbn(isbn, fetchFn)).resolves.toMatchObject({ status: "found" });
  });

  it("falls back when Open Library's record has no author, keeping its title as a prefill", async () => {
    const fetchFn = jest
      .fn()
      .mockReturnValueOnce(json({ [`ISBN:${isbn}`]: { title: "Piranesi" } }))
      .mockReturnValueOnce(json({ totalItems: 0 }));

    await expect(lookupIsbn(isbn, fetchFn)).resolves.toEqual({
      status: "not_found",
      prefill: { title: "Piranesi", author: "", coverUrl: null },
    });
  });

  it("reports not found when neither service has the book", async () => {
    const fetchFn = jest.fn().mockReturnValueOnce(json({})).mockReturnValueOnce(json({ totalItems: 0 }));

    await expect(lookupIsbn(isbn, fetchFn)).resolves.toEqual({ status: "not_found", prefill: null });
  });

  it("treats a rate-limited Google response as no answer", async () => {
    const fetchFn = jest.fn().mockReturnValueOnce(json({})).mockReturnValueOnce(json({ error: {} }, 429));

    await expect(lookupIsbn(isbn, fetchFn)).resolves.toEqual({ status: "not_found", prefill: null });
  });

  it("reports an error when neither service answers", async () => {
    const fetchFn = jest
      .fn()
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockReturnValueOnce(json({}, 503));

    await expect(lookupIsbn(isbn, fetchFn)).resolves.toEqual({ status: "error" });
  });
});
