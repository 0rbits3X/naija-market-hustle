-- Naija Market Hustle v4. Supabase > SQL editor. Run chat_moderation.sql FIRST, then this. Safe to run twice.
-- Replaces hardening.sql (you can skip that one).

-- 1) players: nobody writes directly. Only mh_sync() can.
create table if not exists public.players(
  id uuid primary key, name text, best bigint not null default 0, tier int not null default 0,
  save jsonb, updated_at timestamptz not null default now());
alter table public.players add column if not exists code text;
alter table public.players add column if not exists created_at timestamptz not null default now();
alter table public.players enable row level security;
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='players' loop
    execute format('drop policy %I on public.players', r.policyname);
  end loop; end $$;
drop trigger if exists mh_guard_players on public.players;
create policy mh_players_own_read on public.players for select to authenticated using (id = auth.uid());
revoke insert, update, delete on public.players from anon, authenticated;

-- 2) Public board shows name, best, tier only (never saves or ids)
create or replace view public.leaderboard as
  select name, best, tier from public.players where best > 0 order by best desc limit 20;
grant select on public.leaderboard to anon, authenticated;

-- 3) Score sync with limits. Growth per day is capped by the player's CURRENT tier,
--    and days allowed are limited by real time (about 1 day per 2 seconds + 2).
create or replace function public.mh_sync(p_name text, p_best bigint, p_save jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); o public.players; nm text; b bigint; dn int; dold int; dt numeric;
  ot int; capq int; ok_days int; room bigint; cd text;
begin
  if uid is null then raise exception 'auth'; end if;
  nm := left(regexp_replace(coalesce(p_name,''),'[^A-Za-z0-9 _.-]','','g'),14);
  if length(trim(nm)) < 2 then nm := 'Trader'; end if;
  if p_save is null or jsonb_typeof(p_save) <> 'object' or octet_length(p_save::text) > 4000 then raise exception 'save'; end if;
  b := least(greatest(coalesce(p_best,0),0),200000000);
  dn := greatest(coalesce((p_save->>'day')::int,1),1);
  cd := upper(substr(md5(uid::text),1,6));
  select * into o from public.players where id = uid;
  if not found then
    insert into public.players(id,name,best,tier,save,code,updated_at)
    values(uid,nm,least(b,100000),0,p_save,cd,now());
    return;
  end if;
  if o.updated_at > now() - interval '1 second' then return; end if;
  dold := greatest(coalesce((o.save->>'day')::int,1),1);
  dt := extract(epoch from (now() - o.updated_at));
  ok_days := greatest(0, least(dn - dold, floor(dt/2)::int + 2));
  ot := case when o.best >= 2500000 then 4 when o.best >= 600000 then 3 when o.best >= 150000 then 2 when o.best >= 40000 then 1 else 0 end;
  capq := (array[12,35,100,250,700])[ot+1];
  room := ok_days::bigint * (capq::bigint * 4500 + 5000);
  b := least(greatest(b, o.best), o.best + room);
  update public.players set name = nm, best = b,
    tier = case when b >= 2500000 then 4 when b >= 600000 then 3 when b >= 150000 then 2 when b >= 40000 then 1 else 0 end,
    save = p_save, code = cd, updated_at = now() where id = uid;
end $$;
revoke all on function public.mh_sync(text,bigint,jsonb) from public, anon;
grant execute on function public.mh_sync(text,bigint,jsonb) to authenticated;

-- 4) Chat: preset phrases only (old free-text rows stay, new ones must match)
do $$ begin
  if to_regclass('public.messages') is not null then
    execute 'alter table public.messages drop constraint if exists mh_msg_preset';
    execute $c$alter table public.messages add constraint mh_msg_preset check (body in (
      'Good morning, oga! 👋','Fresh goods, come and buy! 🛒','Price don drop! 📉','Price don rise! 📈',
      'Who wan trade? 🤝','Well done! 👏','I just got promoted! 🎉','Abeg, small discount?',
      'Rain dey fall 🌧️','Market is busy today 🔥')) not valid$c$;
  end if; end $$;

-- 5) Gifts: small, limited, no text. Sender needs Market stall level (net worth 40,000).
create table if not exists public.gifts(
  id bigint generated always as identity primary key,
  from_uid uuid not null, to_uid uuid not null,
  amount int not null check (amount between 100 and 50000),
  claimed boolean not null default false, created_at timestamptz not null default now());
alter table public.gifts enable row level security;
revoke all on public.gifts from anon, authenticated;

create or replace function public.mh_send(p_code text, p_amount int) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); me public.players; tgt uuid; tot bigint; cnt int;
begin
  if uid is null then return 'auth'; end if;
  select * into me from public.players where id = uid;
  if not found or me.best < 40000 then return 'low_level'; end if;
  if p_amount is null or p_amount < 100 or p_amount > least(50000, me.best/20) then return 'too_big'; end if;
  select id into tgt from public.players where code = upper(trim(coalesce(p_code,'')));
  if tgt is null then return 'not_found'; end if;
  if tgt = uid then return 'self'; end if;
  select coalesce(sum(amount),0), count(*) into tot, cnt from public.gifts where from_uid = uid and created_at > now() - interval '24 hours';
  if cnt >= 5 or tot + p_amount > least(100000, me.best/10) then return 'daily_limit'; end if;
  if (select count(*) from public.gifts where to_uid = tgt and not claimed) >= 5 then return 'inbox_full'; end if;
  insert into public.gifts(from_uid,to_uid,amount) values(uid,tgt,p_amount);
  return 'ok';
end $$;

create or replace function public.mh_claim() returns bigint
language plpgsql security definer set search_path = public as $$
declare t bigint;
begin
  if auth.uid() is null then return 0; end if;
  with c as (update public.gifts set claimed = true where to_uid = auth.uid() and not claimed returning amount)
  select coalesce(sum(amount),0) into t from c;
  return t;
end $$;
revoke all on function public.mh_send(text,int), public.mh_claim() from public, anon;
grant execute on function public.mh_send(text,int), public.mh_claim() to authenticated;
