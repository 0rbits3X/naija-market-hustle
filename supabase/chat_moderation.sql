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
