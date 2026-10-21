# shelf-share
Share your books with your friends and community

A mobile app for lending physical books to neighbors. The V1 design spec and screen mockups live
in [`.claude/skills/shelf-share/references/`](.claude/skills/shelf-share/references/).

## Stack

Expo (React Native) with Expo Router · TypeScript (strict) · Supabase (Postgres, Auth, Storage,
Edge Functions)

## Getting started

```bash
npm install
npm start          # Expo dev server; press i / a / w for iOS, Android, or web
```

### Connect Supabase and sign-in providers

Copy `.env.example` to `.env` and set the Supabase project URL and publishable (or legacy
anon) key. Do not put a service-role key in the app. Enable Google and Apple providers in
Supabase Auth. Google additionally needs web and iOS OAuth client IDs; set the IDs in the
matching `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` variables. Set `GOOGLE_IOS_URL_SCHEME` to the
reversed iOS client ID so the Google config plugin can register the native callback URL.

Google Sign-In uses native code and requires a development build; it is not available in
Expo Go. Apple Sign-In appears on supported iOS devices. After changing native configuration,
rebuild the development app. First sign-in is gated on creating a profile with a display name
and city.

## Checks

```bash
npm test           # Jest (jest-expo) + React Native Testing Library
npm run typecheck
npm run lint
```

## Layout

```
src/app/          # routes only (Expo Router); (tabs)/ holds Search, My library, Activity, Profile
src/components/   # shared UI
src/constants/    # theme colors
src/lib/          # plain logic
src/data/         # sample data used by component tests
supabase/         # Supabase CLI config; SQL migrations go in supabase/migrations/
```

Local Supabase (`npx supabase start`) needs Docker.
