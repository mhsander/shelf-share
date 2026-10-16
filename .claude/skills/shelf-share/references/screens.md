# V1 screen mockups (text summary)

Source: `v1-screens.pdf` (5 phone-width mockups). Bracketed text is placeholder content.
Read the PDF itself for exact layout; this file is for quick lookup.

## Visual language
- Off-white page background, white rounded cards with a thin light-grey border.
- Primary color: dark green (filled buttons, active tab, selected chip, "See all" link, progress bar).
- Dark navy for headings, the send button, and outlined-button borders.
- Bold, heavy display font for screen titles; regular sans for body text.
- Status pills: **Available** = pale green / dark green text, **Lent** = pale amber / brown text,
  **Hidden** = light grey / dark text.
- Book covers without an image are a solid-color rounded rectangle (green, blue, rust, purple,
  navy) with a light stripe near the bottom or top.
- Bottom tab bar: Search · My library · Activity · Profile (icon above label; active tab green).

## 1. Search (home): "Find a book"
- Title "Find a book"; bell icon button top right (notifications).
- Search field: "Title or author".
- Filter chips: `[Your city]` (selected, filled green), "Any neighborhood", "Available now".
- Section "New in your city" with a "See all" link.
- Result cards: cover, **[Book title]**, [Author], "[Neighbor name] · [Neighborhood]", chevron.

## 2. Book detail
- Back button (top left), "…" overflow menu (top right; block/report).
- Large cover, "Available" pill, title, author.
- Owner card: initials avatar, **[Owner name]**, "[Neighborhood] · [N] books to lend", chevron
  to their profile.
- "OWNER'S NOTE": 1–5 star rating, then the owner's personal review.
- Pinned bottom sheet: "Message to [Owner name] (optional)" text area (placeholder "Hi! Could I
  borrow this? I can pick it up this weekend."), full-width green **Ask to borrow** button,
  footnote "Your email stays private. You'll arrange pickup in the app."

## 3. Scanner
- Dark full-screen camera view. Close (X) top left, flash toggle top right.
- Header "Added this session: [N]".
- Green rounded scan frame with an amber scan line; "Point at the barcode on the back cover".
- Link "No barcode? Enter it manually".
- Bottom sheet on a hit: cover, "Found it · ISBN [978…]", title, author, link "Edit details,
  rating or review", buttons **Skip** (outlined) and **Add & scan next** (green). Scanning is a
  continuous batch flow, not one book per visit.

## 4. My library
- Title "My library", "[N] books" on the right.
- Three action tiles: **Scan** (green, primary), "Type it in", "Import CSV".
- Segmented control: All · Available · Lent · Hidden.
- Book rows: cover, title, author, status pill plus detail ("Lent to [Name] · due [date]",
  "Hidden · Not shown to others"), "⋮" row menu.

## 5. Request detail (lender view, accepted state)
- Header: back, small cover, **[Book title]**, "[Borrower name] wants to borrow", "⋮" menu.
- 4-step progress bar: Requested · Accepted · Lent · Returned (current step bold).
- Status banner with calendar icon: "You accepted · due back [date]".
- Chat thread: timestamp divider, incoming bubbles white (left), own bubbles green (right).
- Composer "Message [Borrower name]" with a round navy send button.
- Action buttons: **Cancel request** (outlined) and **Mark as lent** (green). Buttons change with
  the state (see the transition table in `design-spec.md` §7).
