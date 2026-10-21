// Book metadata lookup by ISBN: Open Library first, then Google Books (spec §6.2).
// Both run on the device without an API key.

import type { BookInfo } from "@/types/book";

export type BookMetadata = {
  title: string;
  author: string;
  coverUrl: string | null;
  info: BookInfo;
};

export type LookupResult =
  | { status: "found"; book: BookMetadata }
  // `prefill` holds whatever partial details a service returned, for the manual form.
  | { status: "not_found"; prefill: BookMetadata | null }
  // Neither service answered (offline, server errors). The app offers a retry.
  | { status: "error" };

type FetchFn = (url: string) => Promise<Response>;

const maxSubjects = 4;
const maxDescriptionLength = 2000;

// "September 15, 2020" or "2020-09-15" -> 2020.
function yearFrom(date: unknown): number | null {
  const match = typeof date === "string" ? date.match(/\b(\d{4})\b/) : null;
  return match ? Number(match[1]) : null;
}

const positiveOrNull = (n: unknown) => (typeof n === "number" && n > 0 ? n : null);

// Book descriptions arrive as HTML (Google) or Markdown (Open Library); keep plain paragraphs.
export function cleanDescription(raw: string): string | null {
  const text = raw
    .split(/\n-{5,}/)[0]
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/(\*\*|__|\*|_)(\S[^*_]*?\S|\S)\1/g, "$2")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return null;
  return text.length > maxDescriptionLength ? `${text.slice(0, maxDescriptionLength).trimEnd()}…` : text;
}

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
        info: {
          // Open Library keeps descriptions on the work record; see lookupDescription.
          description: null,
          publisher: record.publishers?.[0]?.name ?? null,
          publishedYear: yearFrom(record.publish_date),
          pageCount: positiveOrNull(record.number_of_pages),
          // Skip machine tags like "genre:fantasy" or "nyt:…".
          subjects: (record.subjects ?? [])
            .map((subject: { name: string }) => subject.name)
            .filter((name: string) => !name.includes(":"))
            .slice(0, maxSubjects),
        },
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
        info: {
          description: info.description ? cleanDescription(info.description) : null,
          publisher: info.publisher ?? null,
          publishedYear: yearFrom(info.publishedDate),
          pageCount: positiveOrNull(info.pageCount),
          subjects: (info.categories ?? []).slice(0, maxSubjects),
        },
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

// Open Library's edition records don't carry the blurb; it lives on the work (two more requests).
// Best effort: any failure just means no description.
export async function lookupDescription(isbn: string, fetchFn: FetchFn = fetch): Promise<string | null> {
  try {
    const edition = await fetchFn(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!edition.ok) return null;
    const workKey: string | undefined = (await edition.json()).works?.[0]?.key;
    if (!workKey) return null;

    const work = await fetchFn(`https://openlibrary.org${workKey}.json`);
    if (!work.ok) return null;
    const description: unknown = (await work.json()).description;
    const text = typeof description === "string" ? description : (description as { value?: string } | undefined)?.value;
    return text ? cleanDescription(text) : null;
  } catch {
    return null;
  }
}
