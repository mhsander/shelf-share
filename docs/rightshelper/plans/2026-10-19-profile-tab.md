# Profile Tab and Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or implement inline in this session under test-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Profile tab with the user's own profile card, an Edit profile modal, a Blocked users screen, and settings rows (policy links, sign out, delete account).

**Architecture:** In-memory `ProfileProvider` context (same shape as `src/hooks/use-library.tsx`) seeded from sample data; pure helpers in `src/lib/profile.ts`; three Expo Router screens. No Supabase or auth in this pass.

**Tech Stack:** Expo SDK 58, Expo Router, React Native, TypeScript strict, `expo-web-browser`, Jest + `@testing-library/react-native` (jest-expo preset).

**Spec:** `docs/rightshelper/specs/2026-10-19-profile-tab-design.md`

## Global Constraints
- Email is never part of `Profile` and never rendered.
- Display name: required, at most 60 characters after trimming. City: required. Neighborhood: optional; empty after trim becomes `null`.
- No new dependencies (no image picker/manipulator). `expo-web-browser` is already installed.
- Routes only in `src/app/`; screen tests in `src/__tests__/`; lib tests beside the code.
- Colors from `src/constants/theme.ts`; reuse `FormField`. Screen titles 32px / weight 900, matching `library.tsx`.
- Sign out and delete account have no backend effect; leave `// TODO:` comments naming Supabase `signOut` and the account-deletion Edge Function.
- Commits on `feature/profile-tab`, ending with `Co-authored-by: Claude <noreply@anthropic.com>`.
- Done = `npm test`, `npm run typecheck`, `npm run lint` all pass.

## Review Focus
1. Whitespace-only input ("   ") in name or city must be treated as empty, not saved. → Task 1 test.
2. A 61-character name after trimming (e.g. 60 chars plus surrounding spaces is fine; 61 real chars is not). → Task 1 boundary tests.
3. Name with a single word, or extra internal spaces ("  Ana   María  Ruiz "), must still give sensible initials ("AR"). → Task 1 test.
4. Clearing a previously set neighborhood must save `null` and the card must then show only the city. → Task 3 test.
5. `openBrowserAsync` rejecting must show "Couldn't open the page." rather than an unhandled rejection. → Task 3 test.

---

### Task 1: Profile types, helpers, and provider

**Files:**
- Create: `src/types/profile.ts`, `src/lib/profile.ts`, `src/data/sample-profile.ts`, `src/hooks/use-profile.tsx`, `src/constants/links.ts`
- Modify: `src/app/_layout.tsx` (wrap children in `ProfileProvider` inside `LibraryProvider`)
- Test: `src/lib/profile.test.ts`

**Interfaces:**
- Produces:
  - `type Profile = { displayName: string; city: string; neighborhood: string | null; avatarUrl: string | null }`
  - `type BlockedUser = { id: string; displayName: string }`
  - `type ProfileDraft = { displayName: string; city: string; neighborhood: string }`
  - `type ProfileErrors = Partial<Record<"displayName" | "city", string>>`
  - `validateProfile(draft: ProfileDraft): { ok: true; profile: Omit<Profile, "avatarUrl"> } | { ok: false; errors: ProfileErrors }`
  - `initials(displayName: string): string`
  - `libraryCounts(books: OwnedBook[]): { total: number; available: number; lent: number }`
  - `ProfileProvider({ children, initialProfile?, initialBlocked? })`, `useProfile(): { profile: Profile; blocked: BlockedUser[]; updateProfile(changes: Omit<Profile, "avatarUrl">): void; unblock(id: string): void }`
  - `links = { privacy: string; terms: string }` (placeholder `https://example.com/privacy`, `/terms`, with a TODO)
  - `sampleProfile` (Ana, Seattle, Capitol Hill, no avatar), `sampleBlocked` (one user, "Chloe")

- [ ] **Step 1: Write failing tests in `src/lib/profile.test.ts`**

```ts
describe("validateProfile", () => {
  it("trims and accepts a valid draft", () => {
    expect(validateProfile({ displayName: "  Ana ", city: " Seattle ", neighborhood: " Capitol Hill " }))
      .toEqual({ ok: true, profile: { displayName: "Ana", city: "Seattle", neighborhood: "Capitol Hill" } });
  });
  it("stores an empty neighborhood as null", () => {
    expect(validateProfile({ displayName: "Ana", city: "Seattle", neighborhood: "   " }))
      .toEqual({ ok: true, profile: { displayName: "Ana", city: "Seattle", neighborhood: null } });
  });
  it("rejects blank name and city", () => {
    expect(validateProfile({ displayName: "   ", city: "", neighborhood: "" }))
      .toEqual({ ok: false, errors: { displayName: "Add your name.", city: "Add your city." } });
  });
  it("allows 60 characters and rejects 61", () => {
    expect(validateProfile({ displayName: ` ${"a".repeat(60)} `, city: "X", neighborhood: "" }).ok).toBe(true);
    expect(validateProfile({ displayName: "a".repeat(61), city: "X", neighborhood: "" }))
      .toEqual({ ok: false, errors: { displayName: "Use 60 characters or fewer." } });
  });
});

describe("initials", () => {
  it.each([["Ana", "A"], ["ana maría ruiz", "AR"], ["  Ana   María  Ruiz ", "AR"], ["", "?"]])("%s → %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

describe("libraryCounts", () => {
  it("counts total, available, and lent", () => {
    // books with statuses: available, available, lent, hidden
    expect(libraryCounts(books)).toEqual({ total: 4, available: 2, lent: 1 });
  });
});
```

- [ ] **Step 2: Run** `npx jest src/lib/profile.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** types, `src/lib/profile.ts`, sample data, `links.ts`, and `use-profile.tsx` (`useReducer` with actions `update` and `unblock`; throw `"useProfile must be used inside ProfileProvider"` outside a provider, as `useLibrary` does). Add a TODO to back the provider with TanStack Query over `profiles` and `blocks`. Mount the provider in `_layout.tsx`.
- [ ] **Step 4: Run** `npx jest src/lib/profile.test.ts && npm run typecheck` — Expected: PASS, no type errors.
- [ ] **Step 5: Commit** `feat: add profile state and helpers`

---

### Task 2: Edit profile modal

**Files:**
- Create: `src/app/edit-profile.tsx`
- Modify: `src/app/_layout.tsx` (add `<Stack.Screen name="edit-profile" options={{ presentation: "modal" }} />`)
- Test: `src/__tests__/edit-profile-screen.test.tsx`

**Interfaces:**
- Consumes: `useProfile`, `validateProfile`, `ProfileDraft`, `FormField`.
- Produces: route `/edit-profile`.

- [ ] **Step 1: Write failing tests** (mock `expo-router` as `{ router: { back: jest.fn() } }`; render inside `ProfileProvider` with a probe that prints `displayName|city|neighborhood`, as in `add-book-screen.test.tsx`):
  - `prefills the current profile`: inputs labeled "Display name", "City", "Neighborhood (optional)" show `Ana`, `Seattle`, `Capitol Hill`.
  - `shows an error once a required field is cleared`: `changeText` City to `""` → "Add your city." visible; Save button has `accessibilityState.disabled === true`. Before any edit, no error text is shown.
  - `saves trimmed values and goes back`: change name to `" Ana R "`, neighborhood to `""`, press "Save" → probe shows `Ana R|Seattle|null`; `router.back` called once.
  - `cancel leaves the profile unchanged`: change name, press "Cancel" → probe still `Ana|Seattle|Capitol Hill`; `router.back` called.
- [ ] **Step 2: Run** `npx jest src/__tests__/edit-profile-screen.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** `EditProfileScreen`: local `ProfileDraft` state from `profile` (null neighborhood → `""`), a `touched` set per field; show `errors[field]` only when touched; Save (`accessibilityRole="button"`, disabled when `!result.ok`) calls `updateProfile(result.profile)` then `router.back()`. Header row with Cancel / title "Edit profile" / Save. Wrap in `KeyboardAvoidingView` + `ScrollView`.
- [ ] **Step 4: Run** the test file — Expected: PASS.
- [ ] **Step 5: Commit** `feat: add edit profile screen`

---

### Task 3: Profile tab

**Files:**
- Modify: `src/app/(tabs)/profile.tsx` (replace placeholder)
- Create: `src/components/avatar.tsx`, `src/components/settings-row.tsx`
- Test: `src/__tests__/profile-screen.test.tsx`

**Interfaces:**
- Consumes: `useProfile`, `useLibrary`, `initials`, `libraryCounts`, `links`.
- Produces: `Avatar({ name: string; uri: string | null; size: number })` (expo-image when `uri`, else initials on `colors.primary` circle); `SettingsRow({ label: string; icon: Ionicons name; detail?: string; danger?: boolean; onPress: () => void })` with `accessibilityRole="button"` and `accessibilityLabel={label}`. Both reused by Task 4.

- [ ] **Step 1: Write failing tests** (mock `expo-router` `{ router: { push: jest.fn() } }`, mock `expo-web-browser` `{ openBrowserAsync: jest.fn() }`, `jest.spyOn(Alert, "alert")`; render inside `LibraryProvider` (books: available, available, lent, hidden) and `ProfileProvider`):
  - `shows the profile card`: "Ana", "Capitol Hill · Seattle", "4 books · 2 available · 1 lent", initials "A"; no text matching `/@/`.
  - `shows only the city without a neighborhood`: `initialProfile` with `neighborhood: null` → "Seattle" visible and no " · Seattle".
  - `navigates to edit profile and blocked users`: press "Edit profile" → `router.push("/edit-profile")`; press "Blocked users" → `router.push("/blocked-users")`; the blocked row shows detail "1".
  - `opens policy links`: press "Privacy policy" → `openBrowserAsync(links.privacy)`; "Terms" → `links.terms`.
  - `reports a link that fails to open`: `openBrowserAsync` rejects → `Alert.alert` called with "Couldn't open the page."
  - `confirms sign out`: press "Sign out" → `Alert.alert("Sign out?", …)` with buttons "Cancel" and "Sign out".
  - `confirms account deletion with what gets deleted`: press "Delete account" → `Alert.alert` title "Delete your account?" and a message containing "profile, books, and photo" and "Deleted user"; buttons "Cancel" and "Delete" (style `destructive`).
- [ ] **Step 2: Run** `npx jest src/__tests__/profile-screen.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** the screen in a `ScrollView` inside `SafeAreaView edges={["top"]}`: title "Profile", card (`Avatar` size 72, name wraps, location line, counts line), outlined "Edit profile" button, then grouped `SettingsRow`s. Location = `[neighborhood, city].filter(Boolean).join(" · ")`. Counts use "book"/"books" singular/plural as in `library.tsx`. Link handler: `try { await openBrowserAsync(url) } catch { Alert.alert("Couldn't open the page.") }`. Delete message copy: "This deletes your profile, books, and photo. Requests and messages with other people stay, shown as \"Deleted user\"." Confirm handlers are no-ops with the TODOs from Global Constraints.
- [ ] **Step 4: Run** the test file — Expected: PASS.
- [ ] **Step 5: Commit** `feat: build profile tab`

---

### Task 4: Blocked users screen

**Files:**
- Create: `src/app/blocked-users.tsx`
- Modify: `src/app/_layout.tsx` (add `<Stack.Screen name="blocked-users" />`)
- Test: `src/__tests__/blocked-users-screen.test.tsx`

**Interfaces:**
- Consumes: `useProfile().blocked`, `unblock(id)`, `Avatar`.
- Produces: route `/blocked-users`.

- [ ] **Step 1: Write failing tests** (mock `expo-router` `{ router: { back: jest.fn() } }`, spy `Alert.alert`):
  - `lists blocked users`: "Chloe" visible with an "Unblock Chloe" button.
  - `unblocks after confirmation`: press "Unblock Chloe" → `Alert.alert("Unblock Chloe?", …)`; invoking the "Unblock" button's `onPress` removes "Chloe" and shows "You haven't blocked anyone."; invoking "Cancel" instead leaves Chloe listed.
  - `shows the empty state`: `initialBlocked={[]}` → "You haven't blocked anyone."
  - `goes back`: press "Back" → `router.back`.
- [ ] **Step 2: Run** `npx jest src/__tests__/blocked-users-screen.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** `FlatList` of rows (`Avatar` size 40, name, outlined "Unblock" button with `accessibilityLabel={`Unblock ${name}`}`), header with back chevron (`accessibilityLabel="Back"`) and title "Blocked users", `ListEmptyComponent` with the empty copy. Alert message: "They'll be able to see your profile and books again."
- [ ] **Step 4: Run** the test file — Expected: PASS.
- [ ] **Step 5: Commit** `feat: add blocked users screen`

---

### Task 5: Final verification

- [ ] **Step 1:** `npm test` — Expected: all suites pass (existing four screen suites plus three new, and lib tests).
- [ ] **Step 2:** `npm run typecheck` — Expected: no errors.
- [ ] **Step 3:** `npm run lint` — Expected: no errors.
- [ ] **Step 4:** Launch with `npx expo start --web` and check the Profile tab, Edit profile, and Blocked users render and navigate; capture a screenshot as evidence.
- [ ] **Step 5:** Commit any fixes; leave the branch for a PR (no merge).
