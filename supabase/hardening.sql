-- OPTIONAL. Paste in Supabase > SQL editor. Test with a fresh account after.
-- 1) Players: clean the name, never let best drop, cap how fast it can grow.
create or replace function public.mh_guard_players() returns trigger
language plpgsql as $$
begin
  new.name := left(regexp_replace(coalesce(new.name,''),'[^A-Za-z0-9 _.-]','','g'),14);
  if length(trim(new.name)) < 2 then new.name := 'Trader'; end if;
  new.tier := least(greatest(coalesce(new.tier,0),0),4);
  new.best := greatest(coalesce(new.best,0),0);
  if tg_op = 'INSERT' then
    new.best := least(new.best, 100000);
  else
    new.best := least(greatest(new.best, old.best), old.best + 1500000, 200000000);
  end if;
  if new.save is not null and octet_length(new.save::text) > 4000 then new.save := old.save; end if;
  return new;
end $$;
drop trigger if exists mh_guard_players on public.players;
create trigger mh_guard_players before insert or update on public.players
  for each row execute function public.mh_guard_players();

