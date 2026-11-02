-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.tips (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(trim(title)) between 1 and 100),
  category    text not null check (category in (
                'Interview Prep Advice', 'Office Selection', 'Application',
                'Consulting Advice', 'Interesting Case', 'Miscellaneous')),
  contributor text check (contributor is null or char_length(contributor) <= 60),
  source      text check (source is null or char_length(source) <= 120),
  body        text not null check (
                char_length(trim(body)) > 0
                and array_length(regexp_split_to_array(trim(body), '\s+'), 1) <= 250),
  created_at  timestamptz not null default now()
);

alter table public.tips enable row level security;

-- Anyone using the site can read all tips and add new ones.
-- Nobody can edit or delete through the site; remove tips from the
-- Supabase Table Editor if you need to moderate.
drop policy if exists "Anyone can read tips" on public.tips;
create policy "Anyone can read tips" on public.tips
  for select to anon using (true);

drop policy if exists "Anyone can add tips" on public.tips;
create policy "Anyone can add tips" on public.tips
  for insert to anon with check (true);
