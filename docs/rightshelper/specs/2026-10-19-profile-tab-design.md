# Profile tab and settings: design

Date: 2026-10-19 · Status: approved in chat, awaiting spec review
Source of truth for product rules: `.claude/skills/shelf-share/references/design-spec.md` (§5, §6.1, §6.7, §9).

## Goal
Replace the placeholder Profile tab with the signed-in user's own profile, an Edit profile screen,
and the settings listed in spec §9. Data is held in memory (as My library is today) so the UI can be
built and tested before Supabase and auth exist.

## Scope
In:
- Profile tab: own profile card and settings list.
- Edit profile modal: display name, city, neighborhood.
- Blocked users screen with unblock.
- Confirmations for sign out and delete account (no backend effect yet).
- Privacy policy and terms links.

Out (later passes):
- Profile photo picking, resizing, and upload (needs `expo-image-picker` and
  `expo-image-manipulator`, native modules that require a development build; belongs with the
  Supabase Storage `avatars` work).
- First-sign-in profile setup screen (spec §6.1).
- Another user's public profile (spec §6.5).
- Supabase queries, auth, and the `profiles` / `blocks` migration.

## Data and state
`src/types/profile.ts`
- `Profile = { displayName: string; city: string; neighborhood: string | null; avatarUrl: string | null }`
  mirrors the `profiles` row (email is deliberately absent).
- `BlockedUser = { id: string; displayName: string }`.
- `ProfileDraft = { displayName: string; city: string; neighborhood: string }` for form input.

`src/lib/profile.ts` (pure, unit-tested)
- `validateProfile(draft)` returns `{ ok: true, profile }` with trimmed values (empty
  neighborhood becomes `null`), or `{ ok: false, errors }` with per-field messages:
  - display name: required; at most 60 characters after trimming.
  - city: required.
- `initials(displayName)`: up to two uppercase initials from the first and last words; `"?"` when empty.
- `libraryCounts(books)`: `{ total, available, lent }` from `OwnedBook[]`.

`src/hooks/use-profile.tsx`
- `ProfileProvider` with `initialProfile` and `initialBlocked` props (defaults from
  `src/data/sample-profile.ts`), backed by `useReducer`.
- `useProfile()` exposes `profile`, `blocked`, `updateProfile(profile)`, `unblock(id)`.
- Mounted in `src/app/_layout.tsx` alongside `LibraryProvider`.
- TODO marker: replace with TanStack Query over `profiles` and `blocks` once auth is in place.

## Screens
**Profile tab** (`src/app/(tabs)/profile.tsx`)
- Title "Profile".
- Card: avatar (photo when `avatarUrl` is set, otherwise initials on a green circle), display
  name, "Neighborhood · City" (just city when no neighborhood), counts line
  "N books · N available · N lent" from `useLibrary`.
- **Edit profile** button → `router.push("/edit-profile")`.
- Settings rows (each a button with a chevron):
  - Blocked users (shows count when > 0) → `/blocked-users`.
  - Privacy policy, Terms → `WebBrowser.openBrowserAsync(url)` (`expo-web-browser`, already
    installed). URLs come from `src/constants/links.ts` and are placeholders until real pages exist.
  - Sign out → confirm alert; confirming does nothing yet (TODO: Supabase `signOut`).
  - Delete account (danger color) → confirm alert stating that the profile, books, and photo are
    deleted and that requests and messages with others remain as "Deleted user"; confirming does
    nothing yet (TODO: account-deletion Edge Function).
- The user's email is not shown.

**Edit profile** (`src/app/edit-profile.tsx`, modal presentation)
- Fields: Display name, City, Neighborhood (optional), using `FormField`.
- A field's error appears once the user has edited that field. Save is disabled while the form is invalid.
- Save calls `updateProfile` and `router.back()`; Cancel calls `router.back()` without saving.

**Blocked users** (`src/app/blocked-users.tsx`, pushed card)
- Back button and title "Blocked users".
- One row per blocked user: initials avatar, name, **Unblock** button. Unblock asks for
  confirmation, then removes the row.
- Empty state: "You haven't blocked anyone."

## Errors and edge cases
- No network calls in this pass, so no retry states yet.
- If `openBrowserAsync` throws, show an alert "Couldn't open the page."
- Long names wrap rather than truncate on the profile card.

## Testing
Tests are written first (TDD).
- `src/lib/profile.test.ts`: validation (trim, 60-char boundary, missing city, empty
  neighborhood → null), initials, counts.
- `src/__tests__/profile-screen.test.tsx`: renders name, location, counts; navigation to edit and
  blocked users; opens policy link; sign-out and delete confirmations show the right copy.
- `src/__tests__/edit-profile-screen.test.tsx`: prefilled values; validation errors; save updates
  the profile and goes back; cancel doesn't save.
- `src/__tests__/blocked-users-screen.test.tsx`: lists users; unblock removes after confirmation;
  empty state.
- Done when `npm test`, `npm run typecheck`, and `npm run lint` pass.

## Known issue outside this scope
`supabase/migrations/20261016220549_profiles_and_library_books.sql` is empty, so the pgTAP tests in
`supabase/tests/database/` cannot pass. Fix before backend work.
