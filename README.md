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
src/data/         # sample data until Supabase queries are wired up
supabase/         # Supabase CLI config; SQL migrations go in supabase/migrations/
```

Local Supabase (`npx supabase start`) needs Docker.
