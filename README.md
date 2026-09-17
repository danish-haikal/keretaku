# KeretaKu 🚗

Service records and reminders for every car in the house — a small personal app that replaces
scrolling back through WhatsApp to find when a car was last serviced.

Built with **React + TypeScript + Vite**, **Supabase** (Postgres, Auth, Row Level Security) and
deployed on **Cloudflare Pages**.

## Features

- **Garage** — every vehicle with its plate and current mileage in one list
- **Vehicle profile** — body type, fuel type, road tax and insurance expiry with a days-left countdown
- **Fuel log** — litres, cost, station, full-tank flag (petrol, diesel and hybrid vehicles)
- **Charging log** — kWh, cost, charger location, AC/DC (electric and hybrid vehicles)
- **Service history** — searchable, with a **Next service** section that sets the reminder by km, by
  date, or both — whichever comes first
- **Reminders** — everything due across all vehicles, grouped into overdue / due soon / later
- **Spending** — lifetime total per vehicle, split by fuel, charging and service
- Light and dark mode, mobile-first layout

## Quick start

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase values
npm run dev                    # http://localhost:5173
```

Full setup, including creating the Supabase project and running the database migration, is in
[`docs/SETUP.md`](docs/SETUP.md). Deployment to Cloudflare Pages and connecting a custom domain is in
[`docs/DEPLOY.md`](docs/DEPLOY.md).

## Scripts

| Command             | What it does                               |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Start the dev server with hot reload       |
| `npm run build`     | Typecheck and build to `dist/`             |
| `npm run preview`   | Serve the production build locally         |
| `npm run typecheck` | TypeScript only, no output                 |
| `npm run lint`      | ESLint over the whole project              |
| `npm run format`    | Format everything with Prettier            |
| `npm run test`      | Run the unit tests (reminder + date logic) |

## Project structure

```
src/
  api/           React Query hooks — one file per table group
  components/
    layout/      App shell, bottom nav, page header
    ui/          Reusable primitives (Button, Field, Sheet, ListRow, Icon…)
    vehicle/     Vehicle-specific pieces (hero, tabs, renewal chips, spending)
  hooks/         useAuth, useTheme, useToast, React contexts
  lib/           supabase client, date maths, formatting, reminder rules
  pages/         One file per screen; vehicle/ holds the vehicle flows
  providers/     Auth and toast providers
  styles/        tokens.css (design tokens) + global.css
  types/         Database row types
supabase/
  migrations/    SQL schema, RLS policies, triggers
docs/            Setup and deployment guides
```

### Conventions

- **Styling**: CSS Modules (`Component.module.css`) next to each component. Colours, spacing and
  fonts come from the tokens in `src/styles/tokens.css` — never hard-code a colour, so light and
  dark mode both keep working.
- **Imports**: use the `@/` alias (`@/lib/format`), not long relative paths.
- **Data**: components never call Supabase directly; they use the hooks in `src/api/`.
- **Dates**: `YYYY-MM-DD` strings everywhere, handled by `src/lib/dates.ts` so timezones don't shift
  a date by a day.

## How reminders work

There are no repeating intervals to configure. When you log a service you set **next service** — a
km reading, a date, or both. That becomes the reminder, and logging the same item again replaces it.
This mirrors the sticker a workshop puts on the windscreen.

Under the hood, the `maintenance_reminders` view picks the newest service log per vehicle and item,
and drops any whose latest entry has no next-service values.

## Security

Every table has Row Level Security. Vehicles belong to a household, and you only see rows for
households you're a member of. The app ships a single-user household per sign-up; adding family
members later means inserting a `household_members` row — no schema change.

The Supabase publishable key in `.env.local` is meant to be public; RLS is what protects the data.

## Licence

Personal project — all rights reserved.
