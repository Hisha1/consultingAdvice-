-- Spotify play log for the /music page.
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.spotify_plays (
  played_at   timestamptz primary key,          -- one row per play (Spotify's timestamp)
  track_id    text not null,
  track_name  text not null,
  artists     text not null,
  album       text,
  image_url   text,
  track_url   text,
  inserted_at timestamptz not null default now()
);

create index if not exists spotify_plays_track_idx on public.spotify_plays (track_id, played_at desc);

alter table public.spotify_plays enable row level security;

-- The Worker (using the publishable key) can add plays and read them.
-- Nobody can edit or delete plays through the API.
drop policy if exists "Worker can read plays" on public.spotify_plays;
create policy "Worker can read plays" on public.spotify_plays
  for select to anon using (true);

drop policy if exists "Worker can add plays" on public.spotify_plays;
create policy "Worker can add plays" on public.spotify_plays
  for insert to anon with check (true);

-- Most-played tracks over the last `days` days (ties go to the most recently played).
create or replace function public.top_spotify_tracks(days int default 7, max_tracks int default 3)
returns table (
  track_id text, track_name text, artists text, album text,
  image_url text, track_url text, plays bigint, last_played timestamptz
)
language sql stable security invoker as $$
  with recent as (
    select * from public.spotify_plays
    where played_at >= now() - make_interval(days => top_spotify_tracks.days)
  ),
  counts as (
    select track_id, count(*) as plays, max(played_at) as last_played
    from recent group by track_id
  )
  select c.track_id, r.track_name, r.artists, r.album, r.image_url, r.track_url,
         c.plays, c.last_played
  from counts c
  join recent r on r.track_id = c.track_id and r.played_at = c.last_played
  order by c.plays desc, c.last_played desc, c.track_id
  limit greatest(1, least(top_spotify_tracks.max_tracks, 50))
$$;

grant execute on function public.top_spotify_tracks(int, int) to anon;
