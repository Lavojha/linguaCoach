create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  language text not null,
  level text not null,
  scenario text not null,
  duration_seconds integer not null default 0,
  user_turns integer not null default 0,
  overall numeric not null default 0,
  fluency numeric not null default 0,
  grammar numeric not null default 0,
  vocabulary numeric not null default 0,
  confidence numeric not null default 0,
  summary text not null default ''
);

create table if not exists public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  meaning text not null default '',
  example text not null default '',
  language text not null,
  first_seen_at timestamptz not null default now(),
  review_count integer not null default 1,
  unique (user_id, language, word)
);

alter table public.profiles enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.vocabulary enable row level security;

create policy "profiles own row" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "sessions own rows" on public.learning_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "vocabulary own rows" on public.vocabulary
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
