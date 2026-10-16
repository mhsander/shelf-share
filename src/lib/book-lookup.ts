// Book metadata lookup by ISBN: Open Library first, then Google Books (spec §6.2).
// Both run on the device without an API key.

export type BookMetadata = {
  title: string;
  author: string;
  coverUrl: string | null;
};

export type LookupResult =
  | { status: "found"; book: BookMetadata }
  // `prefill` holds whatever partial details a service returned, for the manual form.
  | { status: "not_found"; prefill: BookMetadata | null }
  // Neither service answered (offline, server errors). The app offers a retry.
  | { status: "error" };

type FetchFn = (url: string) => Promise<Response>;

// A service either answered (with a match or null) or failed to answer.
type ServiceAnswer = { answered: true; book: BookMetadata | null } | { answered: false };

async function askOpenLibrary(isbn: string, fetchFn: FetchFn): Promise<ServiceAnswer> {
  try {
    const res = await fetchFn(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    if (!res.ok) return { answered: false };
    const body = await res.json();
    const record = body[`ISBN:${isbn}`];
    if (!record?.title) return { answered: true, book: null };
    return {
      answered: true,
      book: {
        title: record.title,
        author: (record.authors ?? []).map((a: { name: string }) => a.name).join(", "),
        coverUrl: record.cover?.medium ?? null,
      },
    };
  } catch {
    return { answered: false };
  }
}

async function askGoogleBooks(isbn: string, fetchFn: FetchFn): Promise<ServiceAnswer> {
  try {
    const res = await fetchFn(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    if (!res.ok) return { answered: false };
    const body = await res.json();
    const info = body.items?.[0]?.volumeInfo;
    if (!info?.title) return { answered: true, book: null };
    const thumbnail: string | undefined = info.imageLinks?.thumbnail;
    return {
      answered: true,
      book: {
        title: info.title,
        author: (info.authors ?? []).join(", "),
        coverUrl: thumbnail ? thumbnail.replace(/^http:/, "https:") : null,
      },
    };
  } catch {
    return { answered: false };
  }
}

const isComplete = (book: BookMetadata | null): book is BookMetadata => !!book && !!book.author;

export async function lookupIsbn(isbn: string, fetchFn: FetchFn = fetch): Promise<LookupResult> {
  const openLibrary = await askOpenLibrary(isbn, fetchFn);
  if (openLibrary.answered && isComplete(openLibrary.book)) return { status: "found", book: openLibrary.book };

  const google = await askGoogleBooks(isbn, fetchFn);
  if (google.answered && isComplete(google.book)) return { status: "found", book: google.book };

  if (!openLibrary.answered && !google.answered) return { status: "error" };

  const partial = (openLibrary.answered && openLibrary.book) || (google.answered && google.book) || null;
  return { status: "not_found", prefill: partial };
}
