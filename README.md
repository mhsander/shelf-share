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

### Push notifications

Push registration and delivery require a physical device, an EAS project, and a development
or production build (not Expo Go). Run `npx eas-cli@latest init` to link the app and add its
EAS project ID to `app.json`; set stable iOS `bundleIdentifier` and Android `package` values,
configure the iOS APNs and Android FCM credentials using EAS credentials, then rebuild the
native app after the notifications config plugin is added.
Permission is requested after the user has completed profile setup. Users can decline it;
the rest of the app continues to work.

Apply the database migrations, deploy the server-side sender, and configure its shared secret:

```bash
npx supabase db push
npx supabase secrets set PUSH_WEBHOOK_SECRET='<same-random-secret-as-the-vault-value>'
npx supabase functions deploy send-push
```

Set `PUSH_WEBHOOK_SECRET` only as a Supabase Function secret and create matching Vault
secrets from the Supabase SQL editor (replace the placeholders; never commit the secret):

```sql
select vault.create_secret(
  'https://<project-ref>.supabase.co/functions/v1/send-push',
  'push_webhook_url'
);
select vault.create_secret('<same-random-secret-as-the-function-secret>', 'push_webhook_secret');
```

The migration schedules due-date reminders daily at 16:00 UTC (about 8–9 a.m. in Seattle).
Database triggers enqueue borrow, message, and friend-request events asynchronously through
`pg_net`; a missing sender configuration or delivery failure is logged and does not block
the underlying database transaction. Set the optional `EXPO_ACCESS_TOKEN` Function secret
if Expo push access-token security is enabled for the EAS project. Expo credentials and
Supabase/Vault secrets are deployment configuration and are not stored in this repository.

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
supabase/         # Supabase CLI config, SQL migrations, and Edge Functions
```

Local Supabase (`npx supabase start`) needs Docker.
