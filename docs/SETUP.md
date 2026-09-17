# Setup — from zip to running app

Everything here is done once. Roughly 20–30 minutes.

## 1. Install the tools (Windows)

| Tool        | Where                                | Check it worked |
| ----------- | ------------------------------------ | --------------- |
| Node.js 22+ | <https://nodejs.org> (LTS installer) | `node -v`       |
| Git         | <https://git-scm.com/download/win>   | `git --version` |
| VS Code     | <https://code.visualstudio.com>      | —               |

Open the project folder in VS Code and accept the prompt to install the recommended extensions
(ESLint, Prettier, EditorConfig, Supabase).

## 2. Install dependencies

Open the VS Code terminal (`` Ctrl+` ``) in the project folder:

```bash
npm install
```

## 3. Create the Supabase project

1. Go to <https://supabase.com> → **New project**.
2. Name it `keretaku`, pick the **Southeast Asia (Singapore)** region, and set a database password
   (save it in your password manager).
3. Wait for provisioning to finish.

## 4. Create the database tables

1. In the Supabase dashboard, open **SQL Editor** → **New query**.
2. Open `supabase/migrations/20260918000000_initial_schema.sql` in VS Code, copy the whole file, and
   paste it into the SQL editor.
3. Click **Run**. It should finish with "Success".

This creates the tables, Row Level Security policies, the `maintenance_reminders` view and three
triggers (one of which gives every new user their own household).

> Prefer the CLI? `npx supabase link --project-ref <ref>` then `npx supabase db push` applies the
> same migration and keeps future ones in version control.

## 5. Connect the app to Supabase

1. In Supabase: **Project Settings → API Keys**. Copy the **Project URL** and the **publishable**
   key (`sb_publishable_…`; on older projects this is the `anon` key).
2. In VS Code, copy `.env.example` to `.env.local` and fill both values:

```env
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

`.env.local` is gitignored, so these never reach GitHub. The publishable key is safe in a browser —
Row Level Security is what keeps the data private.

## 6. Turn off email confirmation

KeretaKu signs in with **email + password** — no emails involved, so nothing to rate-limit. The one
thing to switch off is Supabase's default "confirm your email before you can sign in" step, since
that step _does_ send an email:

In Supabase: **Authentication → Sign In / Providers → Email** → turn **Confirm email** off → Save.

(Skip this and you can still use the app — you'll just need to click a confirmation link in your
inbox once after creating each account.)

## 7. Run it

```bash
npm run dev
```

Open <http://localhost:5173>, click **Create an account**, enter an email and a password (6+
characters — it doesn't need to be a real inbox you can access), and you'll land straight in an
empty garage. Next time, use **Sign in** with the same email and password. Add a vehicle and log a
service to see reminders appear.

> Each family member can be its own account (Authentication → Users in the dashboard shows them
> all), or you can just share one email/password for the household — KeretaKu doesn't split data by
> account yet, only by household.

## 8. Daily workflow

```bash
npm run dev        # while building
npm run lint       # before committing
npm run test       # reminder/date logic
npm run build      # confirm a production build still works
```

## Troubleshooting

**"Missing Supabase env vars"** — `.env.local` is missing or misspelled. Restart `npm run dev` after
creating it; Vite only reads env files at startup.

**"Email not confirmed" error when signing in** — step 6 wasn't done before you created the account.
Either redo step 6 then create a new account, or open the confirmation link Supabase emailed you.

**Empty garage after signing in, and adding a vehicle errors** — the migration in step 4 didn't run
fully. Re-run it and check the SQL editor for errors.

**Reminders tab is empty** — reminders come from road tax/insurance dates on a vehicle and from the
"next service" values you set when logging a service. Nothing set means nothing due.
