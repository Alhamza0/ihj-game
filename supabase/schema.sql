-- ============================================================
-- إنسان · حيوان · جماد — مخطّط Supabase (حسابات + ليدربورد)
-- نفّذ هذا الملف كاملاً في: Supabase → SQL Editor → New query → Run
-- آمن لإعادة التنفيذ (idempotent).
-- ============================================================

-- ---------- الجداول ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'لاعب',
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.matches (
  id           uuid primary key default gen_random_uuid(),
  code         text,
  finished_at  timestamptz not null default now(),
  rounds       int  not null default 0,
  player_count int  not null default 0,
  winner_id    uuid references public.profiles(id) on delete set null
);

create table if not exists public.match_players (
  id          bigint generated always as identity primary key,
  match_id    uuid not null references public.matches(id) on delete cascade,
  profile_id  uuid references public.profiles(id) on delete set null,  -- null = ضيف غير مسجّل
  name        text not null,
  score       int  not null default 0,
  placement   int  not null default 0,
  is_winner   boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists match_players_profile_idx on public.match_players(profile_id);
create index if not exists match_players_match_idx   on public.match_players(match_id);
create index if not exists matches_finished_idx      on public.matches(finished_at);

-- ---------- أمان الصفوف (RLS) ----------
-- قراءة عامة للجميع (anon) لعرض الليدربورد والملفات؛ لا كتابة من العميل.
-- الكتابة تتم حصراً من الخادم الموثوق عبر service_role (يتجاوز RLS).
alter table public.profiles      enable row level security;
alter table public.matches       enable row level security;
alter table public.match_players enable row level security;

drop policy if exists "public read profiles"      on public.profiles;
drop policy if exists "public read matches"        on public.matches;
drop policy if exists "public read match_players"  on public.match_players;
create policy "public read profiles"     on public.profiles      for select using (true);
create policy "public read matches"      on public.matches       for select using (true);
create policy "public read match_players" on public.match_players for select using (true);

-- ---------- دالة الليدربورد ----------
-- period ∈ 'all' | 'week' | 'day'
create or replace function public.leaderboard(period text default 'all', lim int default 50)
returns table (
  profile_id   uuid,
  display_name text,
  avatar_url   text,
  total_score  bigint,
  games        bigint,
  wins         bigint
)
language sql stable security definer set search_path = public as $$
  select
    p.id,
    p.display_name,
    p.avatar_url,
    coalesce(sum(mp.score), 0)::bigint,
    count(*)::bigint,
    coalesce(sum(case when mp.is_winner then 1 else 0 end), 0)::bigint
  from public.match_players mp
  join public.matches  m on m.id = mp.match_id
  join public.profiles p on p.id = mp.profile_id
  where mp.profile_id is not null
    and (
      period = 'all'
      or (period = 'week' and m.finished_at >= now() - interval '7 days')
      or (period = 'day'  and m.finished_at >= now() - interval '1 day')
    )
  group by p.id, p.display_name, p.avatar_url
  order by 4 desc, 6 desc
  limit greatest(1, least(lim, 200));
$$;

-- ---------- دالة إحصاءات لاعب (للملف العام) ----------
create or replace function public.player_stats(pid uuid)
returns table (total_score bigint, games bigint, wins bigint, best_score int)
language sql stable security definer set search_path = public as $$
  select
    coalesce(sum(score), 0)::bigint,
    count(*)::bigint,
    coalesce(sum(case when is_winner then 1 else 0 end), 0)::bigint,
    coalesce(max(score), 0)
  from public.match_players
  where profile_id = pid;
$$;

grant execute on function public.leaderboard(text, int) to anon, authenticated;
grant execute on function public.player_stats(uuid)     to anon, authenticated;
