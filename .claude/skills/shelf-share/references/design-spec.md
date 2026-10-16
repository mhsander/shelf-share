# Virtual Free Library: V1 Design Spec

Status: Draft for review · Date: 2026-10-15 · Path: architectural (spec, then implementation plan)

## 1. Summary

A mobile app where people list the physical books they are willing to lend. Other signed-in users can browse and search those libraries and send a borrow request. The lender accepts or declines, the two arrange the handoff inside the app, and the lender marks the book as lent and later as returned. The goal is a public launch for a real local community.

Legend used below: **[Stated]** came from the product owner. **[Decision]** was agreed in design discussion. **[Proposed]** is a default chosen in this spec and open to change.

## 2. Goals and non-goals

### V1 goals
- [Stated] Sign in with a social account and keep a personal profile.
- [Stated] Add books manually, by scanning a barcode, or by importing from Goodreads.
- [Stated] Remove books.
- [Stated] Search books by title and author.
- [Stated] Ask to borrow a book without exposing anyone's email address.
- [Proposed] Filter search by city and neighborhood. Distance-based search is V2.
- [Decision] Basic trust and safety: blocking, reporting, and account deletion.

### V2 (out of scope for V1; do not build)
- Friends and friends-only visibility
- Finding friends through the phone contact list
- Distance-based discovery using device location
- Ratings for how well borrowers care for and return books
- Chat outside the context of a borrow request

### Explicitly not used
- **The Goodreads API.** Goodreads stopped issuing developer keys in December 2020 and is retiring the API (verified). The replacement is importing the CSV file that Goodreads lets users export (section 6.3).

## 3. Success criteria for launch
- A new user can sign in, complete a profile, and add 10 books by scanning in under 5 minutes.
- A borrower can find a book and send a request; the lender gets a push notification.
- A complete loan (requested → accepted → lent → returned) works end to end.
- No user's email address, exact location, or other personal data is visible to other users.
- Passes App Store and Google Play review.

## 4. Platform and stack [Decision]

| Area | Choice |
|---|---|
| App | Expo (React Native), TypeScript in strict mode, Expo Router |
| Backend | Supabase: Postgres, Auth, Storage, Edge Functions |
| Data fetching | TanStack Query on top of supabase-js |
| Barcode scanning | `expo-camera` barcode scanning, EAN-13 only |
| Push notifications | `expo-notifications` and the Expo push service, triggered from an Edge Function |
| CSV parsing | Parsed on the device with `papaparse` |
| Database changes | SQL migrations in `supabase/migrations/`; generated TypeScript types |

Use the current stable Expo SDK and Supabase client. Check package APIs against current documentation before relying on them (section 12).

## 5. Data model

All tables live in `public` with row-level security (RLS) enabled. Timestamps are `timestamptz` and default to `now()`.

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | References `auth.users.id`; deleted when the user is deleted |
| display_name | text, not null | 1–60 characters |
| city | text, not null | |
| neighborhood | text, nullable | |
| avatar_path | text, nullable | Path in the `avatars` storage bucket |
| created_at, updated_at | timestamptz | |

[Stated] Email is never stored here and never displayed. It stays in `auth.users` only.

### `library_books`
One row is one physical copy owned by one user.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid, not null | References `profiles.id`; deleted with the profile |
| title | text, not null | [Stated] |
| author | text, not null | [Stated] |
| isbn | text, nullable | [Stated] Normalized ISBN-13 with digits only; null for manual entries without one |
| cover_url | text, nullable | From the metadata lookup |
| personal_rating | smallint, nullable | [Stated] 1–5 |
| personal_review | text, nullable | [Stated] Up to 5,000 characters |
| status | enum `book_status` | `available`, `lent`, `hidden`; default `available` |
| source | enum `book_source` | `manual`, `scan`, `goodreads_csv` |
| added_at | timestamptz | [Stated] |
| updated_at | timestamptz | |
| search | tsvector | Generated from title and author; GIN index |

Unique constraint on `(owner_id, isbn)` where `isbn` is not null, which prevents duplicate imports.

"Remove a book" is a hard delete, which is allowed only when the book has no open borrow request. Otherwise the app tells the user to resolve the request first.

### `borrow_requests`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| book_id | uuid, not null | References `library_books.id` |
| borrower_id | uuid, not null | References `profiles.id` |
| lender_id | uuid, not null | Copied from the book's owner when the request is created |
| status | enum `request_status` | See section 7 |
| due_date | date, nullable | [Proposed] Set by the lender when accepting; defaults to 3 weeks |
| created_at, updated_at | timestamptz | |

Constraints:
- `borrower_id <> lender_id`
- At most one *open* request (`requested`, `accepted`, or `lent`) per `(book_id, borrower_id)`.
- At most one `lent` request per book.

### `request_messages`
A message thread attached to one borrow request. It replaces "email the owner" from the original requirements.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| request_id | uuid, not null | References `borrow_requests.id` |
| sender_id | uuid, not null | Must be the request's borrower or lender |
| body | text, not null | 1–2,000 characters |
| created_at | timestamptz | |

### `blocks`
Columns: `blocker_id`, `blocked_id`, `created_at`. Primary key is `(blocker_id, blocked_id)`.

### `reports`
Columns: `id`, `reporter_id`, `reported_user_id`, optional `request_id`, `reason` (enum: `not_returned`, `damaged`, `harassment`, `spam`, `other`), `details` text, `created_at`, and `status` (`open`, `reviewed`). Reports can be written by users but read only by admins through the Supabase dashboard.

### `push_tokens`
Columns: `user_id`, `expo_push_token` (unique), `platform`, `updated_at`.

## 6. Features

### 6.1 Authentication and onboarding
- [Stated] Google and Facebook sign-in through Supabase Auth.
- [Decision] Also offer Sign in with Apple on iOS. Apple's rules appear to require a privacy-focused option alongside third-party sign-in; this is from memory and should be confirmed (section 12).
- On first sign-in, the user must complete a profile (display name, city, and optionally neighborhood and photo) before reaching the rest of the app.
- Profile photos are uploaded to the `avatars` bucket, resized on the device to at most 512 px, and stored as JPEG.

### 6.2 Adding books by scan or by hand
- **Scan.** Read an EAN-13 barcode and accept only codes starting with 978 or 979 (books). Look up the ISBN in Open Library first and fall back to Google Books. Show the title, author, and cover pre-filled so the user can confirm or edit before saving. If neither service finds the book, open the manual form with the ISBN filled in.
- **Manual.** Title and author are required; ISBN, rating, and review are optional. Validate ISBN-10 and ISBN-13 checksums and convert ISBN-10 to ISBN-13.
- Run the metadata lookups on the device. No API key is needed for basic Open Library or Google Books ISBN lookups (verify rate limits before launch).

### 6.3 Importing from Goodreads
- The user exports their library as a CSV file from Goodreads and picks the file in the app.
- Parse it on the device. Expected columns: `Title`, `Author`, `ISBN`, `ISBN13`, `My Rating`, `My Review`, `Date Added`, `Bookshelves`, `Exclusive Shelf`. ISBN values are often wrapped in spreadsheet formula syntax such as `="9780..."`, so strip everything except digits and X. Column names and the formatting quirk are from memory; confirm them against a real export before building.
- The user chooses which shelves to import, because a Goodreads library includes books the user has read but doesn't own.
- Show a preview with the number of books to import and the number skipped as duplicates. Then insert in batches of 100 and report how many succeeded and failed.
- A rating of 0 in Goodreads means no rating, so store it as null.

### 6.4 My library
- A list of the user's own books, showing status, with search inside the list.
- Edit any field. Toggle between `available` and `hidden`. Delete a book (subject to the rule in section 5).

### 6.5 Browsing and search
- Search titles and authors with Postgres full-text search. Filter by city (defaults to the user's own city) and optionally by neighborhood.
- Results show only `available` books, never the user's own books, and never books from users who have blocked the viewer or been blocked by them.
- Viewing another user's profile shows their display name, photo, city, neighborhood, and available books. Nothing else.
- [Proposed] Libraries are visible to all signed-in users. Friends-only visibility is V2.

### 6.6 Borrowing
- From a book's page, the borrower taps "Ask to borrow" and writes an optional first message. This creates the request in `requested` status.
- The lender is notified, then accepts (with a due date) or declines.
- Both people use the request's message thread to arrange the handoff.
- The lender marks the book "Lent" at handoff and "Returned" when it comes back.
- An "Activity" tab lists the user's incoming and outgoing requests, grouped by status.

### 6.7 Trust and safety [Decision]
- Block a user from their profile or from a request. Blocking hides each person's books and profile from the other, cancels any open requests between them that haven't reached `lent`, and stops further messages.
- Report a user, optionally attached to a specific request.
- Delete your account in the app. This deletes the profile, books, push tokens, and avatar. Requests and messages involving other users remain, attributed to "Deleted user". Apple requires in-app account deletion for apps that let users create accounts (from memory; confirm).
- Links to the privacy policy and terms appear on the sign-in screen and in settings.

### 6.8 Notifications
Push notifications go to the other person when a request is created, accepted, declined, cancelled, or marked lent or returned, when a new message arrives, and the day before a due date. A database trigger or webhook calls an Edge Function to send them. If sending fails, the request still succeeds; failures are logged.

## 7. Borrow request states

| From | To | Who can do it | Side effect |
|---|---|---|---|
| (none) | requested | Borrower | Notify lender |
| requested | accepted | Lender | Set due date; notify borrower |
| requested | declined | Lender | Notify borrower |
| requested or accepted | cancelled | Either person | Notify the other person |
| accepted | lent | Lender | Set book to `lent`; cancel other open requests for this book and notify those borrowers |
| lent | returned | Lender | Set book back to `available` |

Every other transition is rejected. Enforce this in the database with a Postgres function or trigger, not only in the app. The status-changing actions are security-definer RPC functions: `request_book`, `respond_to_request`, `cancel_request`, `mark_lent`, `mark_returned`.

## 8. Access rules (RLS)
- `profiles`: any signed-in user can read, except when either user has blocked the other. Only the owner can update their own row.
- `library_books`: the owner has full access. Other signed-in users can read rows with status `available`, except where blocked.
- `borrow_requests`: only the borrower and lender can read. Rows are created and changed only through the RPC functions in section 7.
- `request_messages`: only the two people on the request can read and insert, and only while neither has blocked the other.
- `blocks` and `reports`: users can insert their own rows and read their own blocks. Nobody can read reports through the app.
- Storage `avatars`: anyone signed in can read; users can write only under their own user ID.

## 9. Screens
Sign in · Profile setup · Search (home) · Book detail · User profile · My library · Add book (choose scan, manual, or import) · Scanner · Confirm book · Goodreads import · Activity (requests list) · Request detail with message thread · Settings (edit profile, blocked users, privacy policy and terms, sign out, delete account)

## 10. Errors and edge cases
- Network failure: show a retry option. Don't add offline editing in V1.
- Scanning a book already in your library: show "Already in your library" and link to it.
- Requesting a book that just became unavailable: the RPC rejects it and the app shows a clear message.
- Camera permission denied: explain why it's needed and fall back to manual entry.
- If the lender deletes their account while a book is `lent`, the borrower's request moves to `cancelled` and shows "Deleted user".

## 11. Testing
- **Database:** SQL tests run with `supabase test db` (pgTAP) for every RLS rule in section 8 and every allowed and rejected transition in section 7, including the blocking cases.
- **Unit:** ISBN validation and conversion, Goodreads CSV parsing with fixture files (formula-wrapped ISBNs, a rating of 0, missing columns), and the metadata-lookup fallback with the network mocked.
- **Component:** React Native Testing Library for the add-book, search, and request-detail screens.
- **Manual end to end before release:** two test accounts complete a full loan on a physical iOS device and a physical Android device.

## 12. Facts to verify before implementation
Verified during design: the Goodreads API is no longer issuing keys and is being retired.

From memory, not yet checked:
- Apple's current App Store rules on offering a privacy-focused sign-in option, and on in-app account deletion.
- How barcode scanning works in the current `expo-camera` release.
- How native Google and Apple sign-in pass tokens to Supabase (`signInWithIdToken`).
- Meta's app review requirements for Facebook Login.
- The column names and ISBN formatting in the Goodreads CSV export.
- Rate limits on the Open Library and Google Books APIs.

## 13. Open questions (defaults in place; implementation can proceed)
1. Which community launches first? This affects how city and neighborhood are entered (free text now; a fixed list may be better).
2. Default due date: 3 weeks, proposed.
3. Who reviews reports, and how quickly?
4. Is Facebook Login worth the Meta review effort for V1, or should V1 launch with Google and Apple only?
