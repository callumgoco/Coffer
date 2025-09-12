-- Create portfolio_snapshots table with per-user rows and RLS
create table if not exists public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date date not null,
  value numeric not null default 0,
  currency text not null default 'GBP',
  book_cost numeric,
  unrealized numeric,
  pnl numeric,
  inserted_at timestamp with time zone default now(),
  unique (user_id, date)
);

alter table public.portfolio_snapshots enable row level security;

-- Drop existing policies to avoid conflicts when re-running
drop policy if exists "snapshots_select_own" on public.portfolio_snapshots;
drop policy if exists "snapshots_upsert_own" on public.portfolio_snapshots;
drop policy if exists "snapshots_update_own" on public.portfolio_snapshots;
drop policy if exists "snapshots_delete_own" on public.portfolio_snapshots;

-- Re-create policies
create policy "snapshots_select_own"
  on public.portfolio_snapshots
  for select using (auth.uid() = user_id);

create policy "snapshots_upsert_own"
  on public.portfolio_snapshots
  for insert with check (auth.uid() = user_id);

create policy "snapshots_update_own"
  on public.portfolio_snapshots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "snapshots_delete_own"
  on public.portfolio_snapshots
  for delete using (auth.uid() = user_id);


