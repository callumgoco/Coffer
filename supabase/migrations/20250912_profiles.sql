-- Minimal profiles table to store user preferences (e.g., base currency)

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  base_currency text not null default 'GBP',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- Drop pre-existing policies if any
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_upsert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- Users can read and write only their own profile
create policy "profiles_select_own"
  on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_upsert_own"
  on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Create a trigger to auto-provision a profile when a user is created
drop function if exists public.handle_new_user() cascade;
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


