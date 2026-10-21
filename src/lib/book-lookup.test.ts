import { cleanDescription, lookupDescription, lookupIsbn } from "@/lib/book-lookup";

const isbn = "9781635575637";

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

const openLibraryHit = {
  [`ISBN:${isbn}`]: {
    title: "Piranesi",
    authors: [{ name: "Susanna Clarke" }],
    cover: { medium: "https://covers.openlibrary.org/b/id/1-M.jpg" },
    publishers: [{ name: "Bloomsbury Publishing" }],
    publish_date: "September 15, 2020",
    number_of_pages: 245,
    subjects: [{ name: "genre:fantasy" }, { name: "Fiction" }, { name: "Labyrinths" }],
  },
};

const openLibraryInfo = {
  description: null,
  publisher: "Bloomsbury Publishing",
  publishedYear: 2020,
  pageCount: 245,
  // Machine tags such as "genre:fantasy" are dropped.
  subjects: ["Fiction", "Labyrinths"],
};

const emptyInfo = { description: null, publisher: null, publishedYear: null, pageCount: null, subjects: [] };

const googleHit = {
  totalItems: 1,
  items: [
    {
      volumeInfo: {
        title: "Piranesi",
        authors: ["Susanna Clarke"],
        imageLinks: { thumbnail: "http://books.google.com/books/content?id=1" },
        description: "<p>Piranesi's house is <b>no ordinary</b> building.</p>",
        publisher: "Bloomsbury USA",
        publishedDate: "2020-09-15",
        pageCount: 272,
        categories: ["Fiction"],
      },
    },
  ],
};

describe("lookupIsbn", () => {
  it("uses Open Library when it has the book", async () => {
    const fetchFn = jest.fn().mockReturnValueOnce(json(openLibraryHit));

    await expect(lookupIsbn(isbn, fetchFn)).resolves.toEqual({
      status: "found",
      book: {
        title: "Piranesi",
        author: "Susanna Clarke",
        coverUrl: "https://covers.openlibrary.org/b/id/1-M.jpg",
        info: openLibraryInfo,
      },
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toContain(`bibkeys=ISBN:${isbn}`);
  });

  it("falls back to Google Books when Open Library has no match", async () => {
    const fetchFn = jest.fn().mockReturnValueOnce(json({})).mockReturnValueOnce(json(googleHit));

    await expect(lookupIsbn(isbn, fetchFn)).resolves.toEqual({
      status: "found",
      // Google returns http thumbnails; upgrade them so they load on iOS.
      book: {
        title: "Piranesi",
        author: "Susanna Clarke",
        coverUrl: "https://books.google.com/books/content?id=1",
        info: {
          description: "Piranesi's house is no ordinary building.",
          publisher: "Bloomsbury USA",
          publishedYear: 2020,
          pageCount: 272,
          subjects: ["Fiction"],
        },
      },
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
      prefill: { title: "Piranesi", author: "", coverUrl: null, info: emptyInfo },
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

describe("lookupDescription", () => {
  it("reads the description from the Open Library work", async () => {
    const fetchFn = jest
      .fn()
      .mockReturnValueOnce(json({ works: [{ key: "/works/OL1W" }] }))
      .mockReturnValueOnce(json({ description: { type: "/type/text", value: "**A house** of infinite halls." } }));

    await expect(lookupDescription(isbn, fetchFn)).resolves.toBe("A house of infinite halls.");
    expect(fetchFn.mock.calls[0][0]).toBe(`https://openlibrary.org/isbn/${isbn}.json`);
    expect(fetchFn.mock.calls[1][0]).toBe("https://openlibrary.org/works/OL1W.json");
  });

  it("accepts a plain-string description", async () => {
    const fetchFn = jest
      .fn()
      .mockReturnValueOnce(json({ works: [{ key: "/works/OL1W" }] }))
      .mockReturnValueOnce(json({ description: "A house." }));

    await expect(lookupDescription(isbn, fetchFn)).resolves.toBe("A house.");
  });

  it("returns null when there's no work or no description", async () => {
    await expect(lookupDescription(isbn, jest.fn().mockReturnValueOnce(json({})))).resolves.toBeNull();
    const noDescription = jest.fn().mockReturnValueOnce(json({ works: [{ key: "/works/OL1W" }] })).mockReturnValueOnce(json({}));
    await expect(lookupDescription(isbn, noDescription)).resolves.toBeNull();
  });

  it("returns null when the request fails", async () => {
    const fetchFn = jest.fn().mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(lookupDescription(isbn, fetchFn)).resolves.toBeNull();
  });
});

describe("cleanDescription", () => {
  it("strips HTML and Markdown and collapses spacing", () => {
    expect(cleanDescription("<p>One <i>two</i></p>\n\n<p>three</p>")).toBe("One two\n\nthree");
    expect(cleanDescription("**Bold** and _soft_ text")).toBe("Bold and soft text");
  });

  it("drops Open Library's trailing source notes", () => {
    expect(cleanDescription("The story.\n\n----------\nAlso contained in: ...")).toBe("The story.");
  });

  it("returns null for empty text", () => {
    expect(cleanDescription("  <p></p> ")).toBeNull();
  });
});
