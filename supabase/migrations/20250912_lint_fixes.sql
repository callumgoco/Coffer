-- Security & performance lint fixes

-- 1) Ensure deterministic search_path for helper trigger functions
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_user_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

-- 2) Normalize RLS policies to use (select auth.uid()) to avoid initplan re-evaluation
-- Drop all existing policies for key tables to remove duplicates/dev policies
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'accounts',
        'transactions',
        'budgets',
        'holdings',
        'assets',
        'watchlist',
        'incomes',
        'portfolio_snapshots'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end$$;

-- profiles (id is the user id)
alter table if exists public.profiles enable row level security;
create policy "profiles_select_own"
  on public.profiles for select using (id = (select auth.uid()));
create policy "profiles_upsert_own"
  on public.profiles for insert with check (id = (select auth.uid()));
create policy "profiles_update_own"
  on public.profiles for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- portfolio_snapshots
alter table if exists public.portfolio_snapshots enable row level security;
create policy "snapshots_select_own"
  on public.portfolio_snapshots for select using (user_id = (select auth.uid()));
create policy "snapshots_upsert_own"
  on public.portfolio_snapshots for insert with check (user_id = (select auth.uid()));
create policy "snapshots_update_own"
  on public.portfolio_snapshots for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "snapshots_delete_own"
  on public.portfolio_snapshots for delete using (user_id = (select auth.uid()));

-- Helper to apply canonical per-user policies to tables that have a user_id column
-- accounts
alter table if exists public.accounts enable row level security;
create policy "accounts_select_own"
  on public.accounts for select using (user_id = (select auth.uid()));
create policy "accounts_insert_own"
  on public.accounts for insert with check (user_id = (select auth.uid()));
create policy "accounts_update_own"
  on public.accounts for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "accounts_delete_own"
  on public.accounts for delete using (user_id = (select auth.uid()));

-- transactions
alter table if exists public.transactions enable row level security;
create policy "transactions_select_own"
  on public.transactions for select using (user_id = (select auth.uid()));
create policy "transactions_insert_own"
  on public.transactions for insert with check (user_id = (select auth.uid()));
create policy "transactions_update_own"
  on public.transactions for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "transactions_delete_own"
  on public.transactions for delete using (user_id = (select auth.uid()));

-- budgets
alter table if exists public.budgets enable row level security;
create policy "budgets_select_own"
  on public.budgets for select using (user_id = (select auth.uid()));
create policy "budgets_insert_own"
  on public.budgets for insert with check (user_id = (select auth.uid()));
create policy "budgets_update_own"
  on public.budgets for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "budgets_delete_own"
  on public.budgets for delete using (user_id = (select auth.uid()));

-- holdings
alter table if exists public.holdings enable row level security;
create policy "holdings_select_own"
  on public.holdings for select using (user_id = (select auth.uid()));
create policy "holdings_insert_own"
  on public.holdings for insert with check (user_id = (select auth.uid()));
create policy "holdings_update_own"
  on public.holdings for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "holdings_delete_own"
  on public.holdings for delete using (user_id = (select auth.uid()));

-- assets
alter table if exists public.assets enable row level security;
create policy "assets_select_own"
  on public.assets for select using (user_id = (select auth.uid()));
create policy "assets_insert_own"
  on public.assets for insert with check (user_id = (select auth.uid()));
create policy "assets_update_own"
  on public.assets for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "assets_delete_own"
  on public.assets for delete using (user_id = (select auth.uid()));

-- watchlist
alter table if exists public.watchlist enable row level security;
create policy "watchlist_select_own"
  on public.watchlist for select using (user_id = (select auth.uid()));
create policy "watchlist_insert_own"
  on public.watchlist for insert with check (user_id = (select auth.uid()));
create policy "watchlist_update_own"
  on public.watchlist for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "watchlist_delete_own"
  on public.watchlist for delete using (user_id = (select auth.uid()));

-- incomes
alter table if exists public.incomes enable row level security;
create policy "incomes_select_own"
  on public.incomes for select using (user_id = (select auth.uid()));
create policy "incomes_insert_own"
  on public.incomes for insert with check (user_id = (select auth.uid()));
create policy "incomes_update_own"
  on public.incomes for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "incomes_delete_own"
  on public.incomes for delete using (user_id = (select auth.uid()));

-- 3) Drop duplicate indexes flagged by linter (keep the *_key constraint-backed ones)
drop index if exists public.uq_budgets_category;
drop index if exists public.idx_transactions_category;
drop index if exists public.idx_transactions_date;
drop index if exists public.uq_watchlist_symbol;


