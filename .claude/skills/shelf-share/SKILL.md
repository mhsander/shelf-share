---
name: shelf-share
description: Use for any work in the shelf-share repo (the "Virtual Free Library" book-lending app) — planning, scaffolding, schema/RLS, borrow-request flow, scanning, Goodreads import, or UI screens. Holds the V1 design spec and screen mockups.
---

# shelf-share: Virtual Free Library

A mobile app where neighbors list physical books they'll lend; signed-in users search, ask to
borrow, and arrange handoff in an in-app thread. Target: public launch for one local community.

## Read before working
- `references/design-spec.md`: the V1 spec (source of truth for scope, data model, state
  machine, RLS, testing). Read the sections relevant to your task every time.
- `references/screens.md`: text summary of the five mockups and the visual language.
- `references/v1-screens.pdf`: the mockups themselves; check them before building or changing UI.

## Stack (decided)
Expo (React Native) + TypeScript strict + Expo Router · Supabase (Postgres, Auth, Storage, Edge
Functions) · TanStack Query over supabase-js · `expo-camera` EAN-13 scanning · `expo-notifications`
via an Edge Function · `papaparse` on the device · SQL migrations in `supabase/migrations/` with
generated TS types.

## Hard rules
- **V1 scope only.** Don't build V2 items: distance search, borrower ratings, chat outside a
  borrow request (spec §2). Friends and friends-only visibility moved into V1 on 2026-10-19
  (spec §6.9); contacts matching is V1 but blocked on open question §13.5.
- **Never use the Goodreads API.** Import from the user's exported CSV instead (spec §6.3).
- **Email is never stored in `public` tables or shown to other users.** Neither is exact location.
- **Friendships change only through the friend RPCs** (spec §7.1), and friends-only visibility is
  enforced by RLS on `library_books` (spec §8), not only by client filtering.
- **Borrow-request transitions are enforced in Postgres**, via security-definer RPCs
  (`request_book`, `respond_to_request`, `cancel_request`, `mark_lent`, `mark_returned`), not only
  in the app. Any transition not in spec §7 is rejected.
- **RLS is on for every table**; blocking hides profiles, books, and messages in both directions
  (spec §8).
- Every RLS rule and every allowed and rejected transition gets a pgTAP test (`supabase test db`).

## Unverified facts (spec §12)
Check these against current docs before relying on them, and say plainly when something is
still unverified: Apple sign-in and account-deletion rules, the `expo-camera` barcode API,
`signInWithIdToken` for native Google/Apple, Meta review for Facebook Login, Goodreads CSV
columns and `="…"` ISBN quirk, Open Library and Google Books rate limits.

## Open questions (spec §13; defaults in place)
Launch community (free-text city now) · default due date 3 weeks · who reviews reports ·
whether Facebook Login ships in V1 · contacts matching (phone numbers + SMS cost) · invite-link
web domain.

## Repo conventions
- Routes only in `src/app/`; tests live beside the code they cover, or in `src/__tests__/` for
  screens (a test file inside `src/app/` would become a route).
- Add packages with `npx expo install <pkg>` so versions match the Expo SDK.
- Before calling work done: `npm test`, `npm run typecheck`, `npm run lint`.
