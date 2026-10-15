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
