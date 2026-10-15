-- NAIJA MARKET HUSTLE: FULL SETUP. Paste ALL of this in Supabase > SQL editor > Run.
-- Safe to run twice. Do NOT run hardening.sql.

-- ===== 0) Public chat table (created only if you do not have it yet) =====
create table if not exists public.messages(
  id uuid primary key default gen_random_uuid(),
  name text, body text not null,
  uid uuid default auth.uid(),
  hidden boolean not null default false,
  created_at timestamptz not null default now());
alter table public.messages enable row level security;
drop policy if exists mh_msg_read on public.messages;
create policy mh_msg_read on public.messages for select to anon, authenticated using (hidden = false);
drop policy if exists mh_msg_insert on public.messages;
create policy mh_msg_insert on public.messages for insert to authenticated with check (true);
grant select on public.messages to anon, authenticated;
grant insert on public.messages to authenticated;


-- ################ 1) CHAT SAFETY (reports, server rules, auto-hide) ################
-- RUN THIS BEFORE using v3 chat. Supabase > SQL editor. Safe to run twice.
alter table public.messages drop constraint if exists mh_msg_preset;
alter table public.messages add column if not exists uid uuid default auth.uid();
alter table public.messages add column if not exists hidden boolean not null default false;
alter table public.messages add column if not exists id uuid default gen_random_uuid();

create table if not exists public.reports(
  id bigint generated always as identity primary key,
  message_id text not null,
  reporter uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique(message_id, reporter));
alter table public.reports enable row level security;
drop policy if exists mh_report_insert on public.reports;
create policy mh_report_insert on public.reports for insert to anon, authenticated with check (reporter = auth.uid());

-- Server-side message rules (the browser filter is only the first layer)
create or replace function public.mh_guard_messages() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare l text := lower(coalesce(new.body,'')); made timestamptz; lastm timestamptz;
begin
  new.uid := auth.uid(); new.hidden := false;
  new.body := left(trim(new.body),100);
  new.name := left(regexp_replace(coalesce(new.name,''),'[^A-Za-z0-9 _.-]','','g'),14);
  if length(new.body) < 1 then raise exception 'empty'; end if;
  if l ~ '(https?:|www\.|\.(com|ng|net|org|io|me|co|xyz)\M|t\.me|wa\.me|@)' then raise exception 'links'; end if;
  if length(regexp_replace(l,'\D','','g')) >= 7 then raise exception 'phone'; end if;
  if l ~ '\m(add me|dm me|inbox me|whatsapp|telegram|snapchat|snap|instagram|insta|tiktok|my number|call me)\M' then raise exception 'contact'; end if;
  if regexp_replace(translate(l,'013@$45!','oieassai'),'[^a-z]','','g') ~ '(fuck|shit|bitch|pussy|porn|nigg|whore|asshole|ashawo|rape|nude)' then raise exception 'rude'; end if;
  select created_at into made from auth.users where id = auth.uid();
  if made is not null and made > now() - interval '2 minutes' then raise exception 'new_account'; end if;
  select max(created_at) into lastm from public.messages where uid = new.uid;
  if lastm is not null and lastm > now() - interval '5 seconds' then raise exception 'slow_mode'; end if;
  return new;
end $$;
drop trigger if exists mh_guard_messages on public.messages;
create trigger mh_guard_messages before insert on public.messages for each row execute function public.mh_guard_messages();

-- 3 different players report a message -> it hides itself
create or replace function public.mh_auto_hide() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(distinct reporter) from public.reports where message_id = new.message_id) >= 3 then
    update public.messages set hidden = true where id::text = new.message_id;
  end if;
  return new;
end $$;
drop trigger if exists mh_auto_hide on public.reports;
create trigger mh_auto_hide after insert on public.reports for each row execute function public.mh_auto_hide();
-- To review: Table Editor > messages, filter hidden = true. Delete the row, or set hidden=false to restore.


-- ################ 2) SCORES, LEADERBOARD, GIFTS, PHRASE-ONLY PUBLIC CHAT ################
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


-- ################ 3) FRIENDS ROOMS (private free-text chat) ################
-- FRIENDS ROOMS: free-text chat, but only inside a private room with a join code.
-- Run in Supabase > SQL editor. Safe to run twice. Run chat_moderation.sql first.
-- Public chat stays phrase-only (strangers + young players).

create table if not exists public.rooms(
  code text primary key,
  owner uuid not null default auth.uid(),
  created_at timestamptz not null default now());

create table if not exists public.room_members(
  room_code text not null references public.rooms(code) on delete cascade,
  uid uuid not null default auth.uid(),
  joined_at timestamptz not null default now(),
  primary key (room_code, uid));

create table if not exists public.room_messages(
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.rooms(code) on delete cascade,
  uid uuid not null,
  name text not null,
  body text not null,
  created_at timestamptz not null default now());
create index if not exists room_messages_idx on public.room_messages(room_code, created_at desc);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_messages enable row level security;

-- Nobody writes directly. Only the functions below can.
revoke all on public.rooms, public.room_members, public.room_messages from anon, authenticated;
grant select on public.room_members, public.room_messages to authenticated;

drop policy if exists mh_rm_read on public.room_members;
create policy mh_rm_read on public.room_members for select to authenticated
  using (uid = auth.uid());

drop policy if exists mh_rmsg_read on public.room_messages;
create policy mh_rmsg_read on public.room_messages for select to authenticated
  using (exists (select 1 from public.room_members m
                 where m.room_code = room_messages.room_code and m.uid = auth.uid()));

-- 1) Make a room (max 2 per player). Returns the 6-character code to share.
create or replace function public.mh_room_create() returns text
language plpgsql security definer set search_path = public as $$
declare c text; tries int := 0; al text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  if (select count(*) from public.rooms where owner = auth.uid()) >= 2 then raise exception 'too_many_rooms'; end if;
  loop
    c := '';
    for i in 1..6 loop c := c || substr(al, 1 + floor(random()*32)::int, 1); end loop;
    exit when not exists (select 1 from public.rooms where code = c);
    tries := tries + 1; if tries > 20 then raise exception 'try_again'; end if;
  end loop;
  insert into public.rooms(code, owner) values (c, auth.uid());
  insert into public.room_members(room_code, uid) values (c, auth.uid());
  return c;
end $$;

-- 2) Join a room by code (max 20 members, max 5 rooms per player).
create table if not exists public.room_join_fails(uid uuid not null, at timestamptz not null default now());
alter table public.room_join_fails enable row level security;
revoke all on public.room_join_fails from anon, authenticated;

create or replace function public.mh_room_join(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare c text := upper(trim(coalesce(p_code,'')));
begin
  if auth.uid() is null then raise exception 'login'; end if;
  delete from public.room_join_fails where at < now() - interval '1 hour';
  if (select count(*) from public.room_join_fails where uid = auth.uid() and at > now() - interval '10 minutes') >= 8 then return 'slow_down'; end if;
  if not exists (select 1 from public.rooms where code = c) then
    insert into public.room_join_fails(uid) values (auth.uid()); return 'no_room'; end if;
  if exists (select 1 from public.room_members where room_code = c and uid = auth.uid()) then return 'ok'; end if;
  if (select count(*) from public.room_members where room_code = c) >= 20 then return 'full'; end if;
  if (select count(*) from public.room_members where uid = auth.uid()) >= 5 then return 'too_many_rooms'; end if;
  insert into public.room_members(room_code, uid) values (c, auth.uid());
  return 'ok';
end $$;

-- 3) Leave a room.
create or replace function public.mh_room_leave(p_code text) returns void
language sql security definer set search_path = public as $$
  delete from public.room_members where room_code = upper(trim(p_code)) and uid = auth.uid();
$$;

-- 4) Say something. Free text, 200 characters, with safety rules kept ON:
--    no links, no phone numbers, no "add me on...", no slurs/porn words, slow mode.
create or replace function public.mh_room_say(p_code text, p_name text, p_body text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  c text := upper(trim(coalesce(p_code,'')));
  b text := left(trim(coalesce(p_body,'')),200);
  n text := left(regexp_replace(coalesce(p_name,''),'[^A-Za-z0-9 _.-]','','g'),14);
  l text := lower(b); lastm timestamptz;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  if not exists (select 1 from public.room_members where room_code = c and uid = auth.uid()) then raise exception 'not_member'; end if;
  if length(b) < 1 then raise exception 'empty'; end if;
  if length(trim(n)) < 2 then n := 'Trader'; end if;
  if l ~ '(https?:|www\.|\.(com|ng|net|org|io|me|co|xyz)\M|t\.me|wa\.me|@)' then raise exception 'links'; end if;
  if length(regexp_replace(l,'\D','','g')) >= 7 then raise exception 'phone'; end if;
  if l ~ '\m(add me|dm me|inbox me|whatsapp|telegram|snapchat|snap|instagram|insta|tiktok|my number|call me)\M' then raise exception 'contact'; end if;
  if regexp_replace(translate(l,'013@$45!','oieassai'),'[^a-z]','','g') ~ '(fuck|shit|bitch|pussy|porn|nigg|whore|asshole|ashawo|rape|nude)' then raise exception 'rude'; end if;
  select max(created_at) into lastm from public.room_messages where uid = auth.uid();
  if lastm is not null and lastm > now() - interval '2 seconds' then raise exception 'slow_mode'; end if;
  insert into public.room_messages(room_code, uid, name, body) values (c, auth.uid(), n, b);
end $$;

revoke all on function public.mh_room_create(), public.mh_room_join(text),
  public.mh_room_leave(text), public.mh_room_say(text,text,text) from public, anon;
grant execute on function public.mh_room_create(), public.mh_room_join(text),
  public.mh_room_leave(text), public.mh_room_say(text,text,text) to authenticated;

-- Clean-up: delete room messages older than 7 days (run by hand now and then):
-- delete from public.room_messages where created_at < now() - interval '7 days';

grant insert on public.reports to anon, authenticated;
