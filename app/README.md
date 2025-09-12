# Coffer

A modern, local-first finances dashboard. Built with React + TypeScript, Tailwind, React Router, React Query, Zustand, and Recharts.

## Quick start

```bash
npm i && npm run dev
```

Open the app at the URL printed in the terminal.

## Data modes

- `VITE_DATA_MODE=mock` (default): uses local JSON in `src/mocks` and an in-memory adapter.
- `VITE_DATA_MODE=live`: enables API calls for market data behind the Vite proxy `/api/*`.

Create a `.env` file (optional):

```
VITE_DATA_MODE=mock
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ALPHAVANTAGE_API_KEY=
VITE_FMP_API_KEY=
VITE_TWELVEDATA_API_KEY=
VITE_MARKETSTACK_API_KEY=
```

If keys are missing, the UI stays functional and shows a "live data unavailable" badge.

## Scripts

- `npm run dev` – start dev server
- `npm run build` – type-check and build
- `npm run preview` – preview build
- `npm run test` – run unit tests in watch mode
- `npm run test:run` – run unit tests once (CI)

## Tech

- React (Vite) + TypeScript
- Tailwind CSS (CSS variables, light/dark, green accent)
- React Router, React Query, Zustand
- Recharts for charts
- Fonts: Inter via `@fontsource/inter` (Clash Display can be added via a self-host later)
- Icons: Lucide

## Architecture

- UI never calls APIs directly. It uses services in `src/services`.
- `VITE_DATA_MODE` chooses between mock and live adapters.
- Market data (`src/services/marketData`) uses `/api/*` proxy (Alpha Vantage wired).

## .env example

```
VITE_DATA_MODE=mock
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ALPHAVANTAGE_API_KEY=
VITE_FMP_API_KEY=
VITE_TWELVEDATA_API_KEY=
VITE_MARKETSTACK_API_KEY=
```

## Supabase (later)

Settings will include a Developer toggle to enable Supabase (beta). When requested, we'll propose a normalized schema, then generate migrations and RLS (no SQL yet in this repo).

## Server-side portfolio snapshots (Supabase)

1. Create table and RLS

Run in Supabase SQL editor or with CLI:

```sql
-- file: supabase/migrations/20250912_portfolio_snapshots.sql
```

2. Edge Function

Deploy the function:

```bash
supabase functions deploy snapshot --project-ref YOUR_PROJECT_REF
```

Set env vars for the function (Service Role required for cron):

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- BASE_CURRENCY_DEFAULT (optional, e.g. GBP)
- FREECURRENCY_API_KEY (optional, improves FX conversion)

```bash
supabase functions secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... BASE_CURRENCY_DEFAULT=GBP FREECURRENCY_API_KEY=... --project-ref YOUR_PROJECT_REF --env prod
```

3. Schedule daily run

If using Supabase Scheduled Triggers:

```bash
supabase cron schedule daily-snapshot "0 2 * * *" --project-ref YOUR_PROJECT_REF --invoke snapshot
```

Alternatively, use an external cron to POST the function URL.
